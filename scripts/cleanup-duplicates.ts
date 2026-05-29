/**
 * Find and archive duplicate businesses (same town, very similar names).
 *
 * Usage:
 *   npx tsx scripts/cleanup-duplicates.ts           # report only
 *   npx tsx scripts/cleanup-duplicates.ts --apply   # archive losers
 *   npx tsx scripts/cleanup-duplicates.ts --brands  # same-town brand clusters (manual review)
 *
 * Losers get: archived_at, is_hidden_from_search=true, status=archived.
 * Keeps the row with an image when only one has hero/main; otherwise richest data.
 */

import { writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { distanceMeters, nameSimilarity } from "../lib/admin/duplicate-detection";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const APPLY = process.argv.includes("--apply");
const BRANDS = process.argv.includes("--brands");

const MIN_SIM_AUTO = 0.9;
const MIN_SIM_WITH_DISTANCE = 0.85;
const MAX_DISTANCE_M = 400;

type Row = {
  id: string;
  title: string;
  slug: string;
  town_id: string | null;
  map_lat: number | null;
  map_lng: number | null;
  status: string;
  archived_at: string | null;
  content: string | null;
  excerpt: string | null;
  hero_image: string | null;
  main_image: string | null;
  date_created: string | null;
  towns: { title: string } | null;
};

function hasCoords(r: Row): boolean {
  return r.map_lat != null && r.map_lng != null && Number.isFinite(r.map_lat);
}

function hasImage(r: Row): boolean {
  return !!(r.hero_image || r.main_image);
}

function isGeoImportSlug(slug: string): boolean {
  return /-(seaside|grayton|inlet|30a|fl)(-fl)?$/.test(slug) || slug.endsWith("-fl");
}

/** Tiebreaker when both or neither have images. */
function keeperScore(r: Row): number {
  let s = 0;
  const contentLen = r.content?.length ?? 0;
  s += Math.min(contentLen / 200, 15);
  if ((r.excerpt?.length ?? 0) > 20) s += 3;
  if (!isGeoImportSlug(r.slug)) s += 4;
  if (hasCoords(r)) s += 4;
  if (r.status === "published") s += 2;
  return s;
}

/** Prefer the row with hero/main image; otherwise fall back to keeperScore. */
function pickKeeper(a: Row, b: Row): [keep: Row, archive: Row] {
  const aImg = hasImage(a);
  const bImg = hasImage(b);
  if (aImg && !bImg) return [a, b];
  if (bImg && !aImg) return [b, a];
  const scoreA = keeperScore(a);
  const scoreB = keeperScore(b);
  return scoreA >= scoreB ? [a, b] : [b, a];
}

function isDuplicatePair(a: Row, b: Row): { sim: number; reason: string } | null {
  if (a.town_id !== b.town_id || !a.town_id) return null;
  const sim = nameSimilarity(a.title, b.title);
  if (sim >= MIN_SIM_AUTO) {
    return { sim, reason: `name similarity ${sim.toFixed(2)}` };
  }
  if (sim < MIN_SIM_WITH_DISTANCE) return null;

  if (hasCoords(a) && hasCoords(b)) {
    const d = distanceMeters(a.map_lat!, a.map_lng!, b.map_lat!, b.map_lng!);
    if (d <= MAX_DISTANCE_M) {
      return { sim, reason: `name ${sim.toFixed(2)} + ${Math.round(d)}m apart` };
    }
    return null;
  }

  // One or both lack coords (common after CSV import) — only merge very high similarity.
  if (sim >= 0.92) {
    return { sim, reason: `name ${sim.toFixed(2)} (missing coords on one/both)` };
  }
  return null;
}

function findPairs(rows: Row[]): Array<{
  keep: Row;
  archive: Row;
  sim: number;
  reason: string;
}> {
  const byTown = new Map<string, Row[]>();
  for (const r of rows) {
    if (!r.town_id || r.archived_at) continue;
    const list = byTown.get(r.town_id) ?? [];
    list.push(r);
    byTown.set(r.town_id, list);
  }

  const decisions: Array<{
    keep: Row;
    archive: Row;
    sim: number;
    reason: string;
  }> = [];
  const archiveIds = new Set<string>();

  for (const list of byTown.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        const match = isDuplicatePair(a, b);
        if (!match) continue;

        const [keep, archive] = pickKeeper(a, b);

        if (archiveIds.has(archive.id)) continue;
        archiveIds.add(archive.id);
        decisions.push({ keep, archive, sim: match.sim, reason: match.reason });
      }
    }
  }

  decisions.sort(
    (x, y) => y.sim - x.sim || x.keep.towns?.title?.localeCompare(y.keep.towns?.title ?? "") || 0,
  );
  return decisions;
}

const BRAND_STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "at",
  "by",
  "and",
  "of",
  "in",
]);

function brandToken(title: string): string | null {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !BRAND_STOPWORDS.has(w));
  return words[0] ?? null;
}

function brandClusters(rows: Row[]): Map<string, Row[]> {
  const byTownBrand = new Map<string, Row[]>();
  for (const r of rows) {
    if (!r.town_id || r.archived_at) continue;
    const brand = brandToken(r.title);
    if (!brand) continue;
    const key = `${r.town_id}::${brand}`;
    const list = byTownBrand.get(key) ?? [];
    list.push(r);
    byTownBrand.set(key, list);
  }
  const clusters = new Map<string, Row[]>();
  for (const [key, list] of byTownBrand) {
    if (list.length >= 2) clusters.set(key, list);
  }
  return clusters;
}

async function loadRows(): Promise<Row[]> {
  const { data, error } = await supabase
    .from("businesses")
    .select(
      "id, title, slug, town_id, map_lat, map_lng, status, archived_at, content, excerpt, hero_image, main_image, date_created, towns ( title )",
    )
    .is("archived_at", null)
    .neq("status", "archived");

  if (error) throw error;
  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const townsRaw = r.towns;
    const towns =
      townsRaw == null
        ? null
        : Array.isArray(townsRaw)
          ? ((townsRaw[0] as { title?: string } | undefined) ?? null)
          : (townsRaw as { title: string });
    return { ...r, towns } as Row;
  });
}

async function main() {
  const rows = await loadRows();
  console.log(`Loaded ${rows.length} active businesses\n`);

  if (BRANDS) {
    const clusters = brandClusters(rows);
    const lines: string[] = ["# Same-town brand clusters (manual review)", ""];
    for (const list of [...clusters.values()].sort((a, b) => b.length - a.length)) {
      if (list.length < 2) continue;
      const town = list[0].towns?.title ?? "?";
      lines.push(`## ${list[0].title.split(/\s+/)[0]} — ${town} (${list.length})`);
      for (const r of list) {
        lines.push(`- ${r.title} (\`${r.slug}\`)`);
      }
      lines.push("");
    }
    writeFileSync("docs/duplicate-brand-clusters.md", lines.join("\n"));
    console.log(`Wrote docs/duplicate-brand-clusters.md (${clusters.size} clusters)`);
    return;
  }

  const decisions = findPairs(rows);

  if (decisions.length === 0) {
    console.log("No duplicate pairs matched thresholds.");
    return;
  }

  console.log(`Found ${decisions.length} duplicate pair(s) to merge:\n`);
  for (const d of decisions) {
    const town = d.keep.towns?.title ?? "?";
    console.log(`[${town}] sim=${d.sim.toFixed(2)} — ${d.reason}`);
    console.log(`  KEEP:    ${d.keep.title}`);
    console.log(`           /business/${d.keep.slug}`);
    console.log(`  ARCHIVE: ${d.archive.title}`);
    console.log(`           /business/${d.archive.slug}`);
    console.log("");
  }

  const reportLines = [
    "# Duplicate pairs (auto-detected)",
    "",
    `Generated: ${new Date().toISOString().slice(0, 10)}`,
    "",
    "| Town | Similarity | Keep | Archive |",
    "| --- | --- | --- | --- |",
  ];
  for (const d of decisions) {
    const town = d.keep.towns?.title ?? "";
    reportLines.push(
      `| ${town} | ${d.sim.toFixed(2)} | ${d.keep.title} (\`${d.keep.slug}\`) | ${d.archive.title} (\`${d.archive.slug}\`) |`,
    );
  }
  writeFileSync("docs/duplicate-pairs-report.md", reportLines.join("\n") + "\n");
  console.log("Wrote docs/duplicate-pairs-report.md");

  if (!APPLY) {
    console.log("Dry run. Pass --apply to archive losers.");
    return;
  }

  const now = new Date().toISOString();
  for (const d of decisions) {
    const patch: Record<string, unknown> = {};
    if (!hasCoords(d.keep) && hasCoords(d.archive)) {
      patch.map_lat = d.archive.map_lat;
      patch.map_lng = d.archive.map_lng;
    }
    if (!hasImage(d.keep) && hasImage(d.archive)) {
      if (d.archive.main_image) patch.main_image = d.archive.main_image;
      if (d.archive.hero_image) patch.hero_image = d.archive.hero_image;
    }
    if (Object.keys(patch).length > 0) {
      const { error: patchErr } = await supabase
        .from("businesses")
        .update(patch)
        .eq("id", d.keep.id);
      if (patchErr) {
        console.warn(`  ! Could not copy fields to ${d.keep.slug}:`, patchErr.message);
      } else {
        console.log(`  ↳ Copied ${Object.keys(patch).join(", ")} onto keeper ${d.keep.slug}`);
      }
    }

    const { error } = await supabase
      .from("businesses")
      .update({
        status: "archived",
        is_hidden_from_search: true,
        archived_at: now,
      })
      .eq("id", d.archive.id);

    if (error) {
      console.error(`  ✗ Failed to archive ${d.archive.slug}:`, error.message);
    } else {
      console.log(`  ✓ Archived ${d.archive.slug}`);
    }
  }

  console.log("\nCleanup complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
