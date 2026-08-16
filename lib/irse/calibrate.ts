import type { SupabaseClient } from "@supabase/supabase-js";
import { getSiteUrl } from "@/lib/site-url";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { inspectUrl } from "./gsc/client";
import { isGscConfigured } from "./gsc/config";
import { absoluteUrlForPath, pathForKind } from "./paths";
import type { LabeledRoute } from "./parse-label-csv";
import { scorePage } from "./score-page";
import { PAGE_KINDS, type PageKind, type ScoreResult } from "./types";
import { CALIBRATION_SEPARATION_FLOOR } from "./weights";

const KINDS = PAGE_KINDS;

export type CalibrationCandidate = {
  kind: PageKind;
  slug: string;
  path: string;
};

export type CalibrationRow = {
  kind: PageKind;
  slug: string;
  path: string;
  overallScore: number;
  indexed: boolean;
  coverageState?: string;
  scores: ScoreResult["scores"];
  flags: ScoreResult["flags"];
};

export type CalibrationReport = {
  gscConfigured: boolean;
  labeled: number;
  indexedCount: number;
  notIndexedCount: number;
  indexedMean: number | null;
  notIndexedMean: number | null;
  separation: number | null;
  separationFloor: number;
  meetsFloor: boolean;
  histogram: { bucket: string; indexed: number; notIndexed: number }[];
  topFlagsAmongNotIndexed: { code: string; count: number }[];
  rows: CalibrationRow[];
  warnings: string[];
};

export type CalibrateOptions = {
  kinds?: PageKind[];
  /** Target labeled URLs overall (split toward 50/50). */
  sampleSize?: number;
  forceInspect?: boolean;
  /** Max live inspections this run (quota safety). */
  maxInspections?: number;
};

export type CalibrateFromLabelsOptions = {
  routes: LabeledRoute[];
  /** Persist score snapshots. Default true. */
  persist?: boolean;
};

export async function calibrateIrse(
  supabase: SupabaseClient,
  options: CalibrateOptions = {},
): Promise<CalibrationReport> {
  const kinds = options.kinds?.length ? options.kinds : [...KINDS];
  const sampleSize = options.sampleSize ?? 100;
  const maxInspections = options.maxInspections ?? 120;
  const warnings: string[] = [];
  const gscConfigured = isGscConfigured();

  if (!gscConfigured) {
    warnings.push("GSC env vars missing — calibration will use cached inspections only.");
  }

  const candidates = await collectCandidates(supabase, kinds, Math.ceil(sampleSize * 1.5));
  const siteUrl = getSiteUrl();

  let inspectionsUsed = 0;
  const labeled: CalibrationRow[] = [];
  let indexedCount = 0;
  let notIndexedCount = 0;
  const targetEach = Math.floor(sampleSize / 2);

  for (const c of candidates) {
    if (indexedCount >= targetEach && notIndexedCount >= targetEach) break;
    if (labeled.length >= sampleSize) break;

    const abs = absoluteUrlForPath(c.path, siteUrl);
    let indexed: boolean | null = null;
    let coverageState: string | undefined;

    const cached = await supabase
      .from("gsc_url_inspections")
      .select("indexed, coverage_state, inspected_at")
      .eq("url", abs)
      .maybeSingle();

    if (cached.data && cached.data.indexed != null && !options.forceInspect) {
      indexed = cached.data.indexed as boolean;
      coverageState = (cached.data.coverage_state as string | null) ?? undefined;
    } else if (gscConfigured && inspectionsUsed < maxInspections) {
      const gsc = await inspectUrl(supabase, abs, { force: options.forceInspect });
      inspectionsUsed += gsc.fromCache ? 0 : 1;
      indexed = gsc.indexed;
      coverageState = gsc.coverageState;
      if (gsc.error) warnings.push(`${c.path}: ${gsc.error}`);
    } else if (!gscConfigured) {
      continue;
    }

    if (indexed == null) continue;
    if (indexed && indexedCount >= targetEach) continue;
    if (!indexed && notIndexedCount >= targetEach) continue;

    const result = await scorePage(supabase, c.kind, c.slug, {
      inspect: false,
      persist: true,
    });
    if (!result) continue;

    labeled.push({
      kind: c.kind,
      slug: c.slug,
      path: c.path,
      overallScore: result.overallScore,
      indexed,
      coverageState,
      scores: result.scores,
      flags: result.flags,
    });
    if (indexed) indexedCount += 1;
    else notIndexedCount += 1;
  }

  const indexedScores = labeled.filter((r) => r.indexed).map((r) => r.overallScore);
  const notIndexedScores = labeled.filter((r) => !r.indexed).map((r) => r.overallScore);
  const indexedMean = mean(indexedScores);
  const notIndexedMean = mean(notIndexedScores);
  const separation =
    indexedMean != null && notIndexedMean != null
      ? round1(indexedMean - notIndexedMean)
      : null;
  const meetsFloor = separation != null && separation >= CALIBRATION_SEPARATION_FLOOR;

  return {
    gscConfigured,
    labeled: labeled.length,
    indexedCount,
    notIndexedCount,
    indexedMean,
    notIndexedMean,
    separation,
    separationFloor: CALIBRATION_SEPARATION_FLOOR,
    meetsFloor,
    histogram: buildHistogram(labeled),
    topFlagsAmongNotIndexed: topFlags(labeled.filter((r) => !r.indexed)),
    rows: labeled,
    warnings,
  };
}

/**
 * Calibrate from explicit indexed / not-indexed route lists (e.g. CSV).
 * Scores each page with IRSE; does not call GSC.
 */
export async function calibrateIrseFromLabels(
  supabase: SupabaseClient,
  options: CalibrateFromLabelsOptions,
): Promise<CalibrationReport> {
  const warnings: string[] = [];
  const labeled: CalibrationRow[] = [];
  const persist = options.persist !== false;

  for (const route of options.routes) {
    const result = await scorePage(supabase, route.kind, route.slug, {
      inspect: false,
      persist,
    });
    if (!result) {
      warnings.push(`Could not score ${route.kind}/${route.slug} (${route.path})`);
      continue;
    }
    labeled.push({
      kind: result.kind,
      slug: result.slug,
      path: result.path,
      overallScore: result.overallScore,
      indexed: route.indexed,
      scores: result.scores,
      flags: result.flags,
    });
  }

  return buildReportFromRows(labeled, warnings, { gscConfigured: false });
}

function buildReportFromRows(
  labeled: CalibrationRow[],
  warnings: string[],
  meta: { gscConfigured: boolean },
): CalibrationReport {
  const indexedScores = labeled.filter((r) => r.indexed).map((r) => r.overallScore);
  const notIndexedScores = labeled.filter((r) => !r.indexed).map((r) => r.overallScore);
  const indexedMean = mean(indexedScores);
  const notIndexedMean = mean(notIndexedScores);
  const separation =
    indexedMean != null && notIndexedMean != null
      ? round1(indexedMean - notIndexedMean)
      : null;
  const meetsFloor = separation != null && separation >= CALIBRATION_SEPARATION_FLOOR;
  const indexedCount = labeled.filter((r) => r.indexed).length;
  const notIndexedCount = labeled.filter((r) => !r.indexed).length;

  return {
    gscConfigured: meta.gscConfigured,
    labeled: labeled.length,
    indexedCount,
    notIndexedCount,
    indexedMean,
    notIndexedMean,
    separation,
    separationFloor: CALIBRATION_SEPARATION_FLOOR,
    meetsFloor,
    histogram: buildHistogram(labeled),
    topFlagsAmongNotIndexed: topFlags(labeled.filter((r) => !r.indexed)),
    rows: labeled,
    warnings,
  };
}

export type ScoreAllOptions = {
  kinds?: PageKind[];
  /** Persist score snapshots. Default true. */
  persist?: boolean;
  /** Progress logger (e.g. console.log). */
  onProgress?: (done: number, total: number, path: string) => void;
};

export type ScoreAllReport = {
  total: number;
  scored: number;
  failed: number;
  byKind: Record<PageKind, { total: number; scored: number; failed: number }>;
  warnings: string[];
};

/**
 * Score every published IRSE page and persist snapshots (no GSC / no labels).
 * Use for admin badge coverage; use CSV or GSC calibrate modes for indexed vs not-indexed metrics.
 */
export async function scoreAllPublishedPages(
  supabase: SupabaseClient,
  options: ScoreAllOptions = {},
): Promise<ScoreAllReport> {
  const kinds = options.kinds?.length ? options.kinds : [...KINDS];
  const persist = options.persist !== false;
  const warnings: string[] = [];
  const byKind = Object.fromEntries(
    KINDS.map((k) => [k, { total: 0, scored: 0, failed: 0 }]),
  ) as ScoreAllReport["byKind"];

  const candidates = await collectCandidates(supabase, kinds, null);
  for (const kind of kinds) {
    byKind[kind].total = candidates.filter((c) => c.kind === kind).length;
  }

  let scored = 0;
  let failed = 0;
  let done = 0;
  for (const c of candidates) {
    const result = await scorePage(supabase, c.kind, c.slug, {
      inspect: false,
      persist,
    });
    done += 1;
    options.onProgress?.(done, candidates.length, c.path);
    if (!result) {
      failed += 1;
      byKind[c.kind].failed += 1;
      warnings.push(`Could not score ${c.kind}/${c.slug} (${c.path})`);
      continue;
    }
    scored += 1;
    byKind[c.kind].scored += 1;
  }

  return {
    total: candidates.length,
    scored,
    failed,
    byKind,
    warnings,
  };
}

export async function collectCandidates(
  supabase: SupabaseClient,
  kinds: PageKind[],
  /** Per-kind cap; `null` = fetch all published slugs. */
  limitPerKind: number | null,
): Promise<CalibrationCandidate[]> {
  const out: CalibrationCandidate[] = [];
  for (const kind of kinds) {
    const rows = await listSlugs(supabase, kind, limitPerKind);
    for (const slug of rows) {
      out.push({ kind, slug, path: pathForKind(kind, slug) });
    }
  }
  // Round-robin shuffle-ish: interleave kinds
  return interleave(out);
}

const SLUG_PAGE_SIZE = 1000;

async function listSlugs(
  supabase: SupabaseClient,
  kind: PageKind,
  limit: number | null,
): Promise<string[]> {
  const out: string[] = [];
  let from = 0;
  const hardCap = limit ?? Number.POSITIVE_INFINITY;

  while (out.length < hardCap) {
    const pageSize = Math.min(SLUG_PAGE_SIZE, hardCap - out.length);
    if (pageSize <= 0) break;
    const to = from + pageSize - 1;
    const page = await fetchSlugPage(supabase, kind, from, to);
    if (!page.length) break;
    out.push(...page);
    if (page.length < pageSize) break;
    from += page.length;
  }

  return out;
}

async function fetchSlugPage(
  supabase: SupabaseClient,
  kind: PageKind,
  from: number,
  to: number,
): Promise<string[]> {
  switch (kind) {
    case "business": {
      const { data } = await supabase
        .from("businesses_view")
        .select("slug")
        .eq("status", DIRECTUS_PUBLISHED_STATUS)
        .or(BROWSE_VISIBLE_NOT_HIDDEN)
        .is("archived_at", null)
        .not("slug", "is", null)
        .order("id", { ascending: true })
        .range(from, to);
      return (data ?? []).map((r) => String((r as { slug: string }).slug));
    }
    case "guide": {
      const { data } = await supabase
        .from("guides")
        .select("slug")
        .eq("status", DIRECTUS_PUBLISHED_STATUS)
        .not("slug", "is", null)
        .order("id", { ascending: true })
        .range(from, to);
      return (data ?? []).map((r) => String((r as { slug: string }).slug));
    }
    case "town": {
      const { data } = await supabase
        .from("towns_view")
        .select("slug")
        .not("slug", "is", null)
        .order("id", { ascending: true })
        .range(from, to);
      return (data ?? []).map((r) => String((r as { slug: string }).slug));
    }
    case "area": {
      const { data } = await supabase
        .from("areas_view")
        .select("slug")
        .eq("status", DIRECTUS_PUBLISHED_STATUS)
        .is("archived_at", null)
        .not("slug", "is", null)
        .order("id", { ascending: true })
        .range(from, to);
      return (data ?? []).map((r) => String((r as { slug: string }).slug));
    }
    case "category": {
      const { data } = await supabase
        .from("business_categories")
        .select("slug")
        .eq("status", DIRECTUS_PUBLISHED_STATUS)
        .or(BROWSE_VISIBLE_NOT_HIDDEN)
        .is("archived_at", null)
        .not("parent_category_id", "is", null)
        .not("slug", "is", null)
        .order("id", { ascending: true })
        .range(from, to);
      return (data ?? []).map((r) => String((r as { slug: string }).slug));
    }
  }
}

function mean(nums: number[]): number | null {
  if (!nums.length) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function buildHistogram(rows: CalibrationRow[]) {
  const buckets = [
    { bucket: "0-59", min: 0, max: 59 },
    { bucket: "60-69", min: 60, max: 69 },
    { bucket: "70-79", min: 70, max: 79 },
    { bucket: "80-89", min: 80, max: 89 },
    { bucket: "90-100", min: 90, max: 100 },
  ];
  return buckets.map((b) => ({
    bucket: b.bucket,
    indexed: rows.filter((r) => r.indexed && r.overallScore >= b.min && r.overallScore <= b.max)
      .length,
    notIndexed: rows.filter(
      (r) => !r.indexed && r.overallScore >= b.min && r.overallScore <= b.max,
    ).length,
  }));
}

function topFlags(rows: CalibrationRow[], limit = 10): { code: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const f of row.flags) {
      counts.set(f.code, (counts.get(f.code) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function interleave(items: CalibrationCandidate[]): CalibrationCandidate[] {
  const byKind = new Map<PageKind, CalibrationCandidate[]>();
  for (const kind of KINDS) byKind.set(kind, []);
  for (const item of items) byKind.get(item.kind)?.push(item);
  const out: CalibrationCandidate[] = [];
  let added = true;
  while (added) {
    added = false;
    for (const kind of KINDS) {
      const list = byKind.get(kind);
      const next = list?.shift();
      if (next) {
        out.push(next);
        added = true;
      }
    }
  }
  return out;
}

// Re-export for scripts that want the constant list
export { PAGE_KINDS };
