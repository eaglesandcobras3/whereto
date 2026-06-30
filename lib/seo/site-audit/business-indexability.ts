import type { SupabaseClient } from "@supabase/supabase-js";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import type { AuditIssue } from "./types";

const MIN_UNIQUE_TEXT = 80;
const PAGE_SIZE = 500;

type BusinessRow = {
  slug: string | null;
  title: string | null;
  excerpt: string | null;
  content: string | null;
  address: string | null;
  hero_image: string | null;
  main_image: string | null;
  hero_image_url: string | null;
  main_image_url: string | null;
  primary_category_id: string | null;
  town_id: string | null;
  is_hidden_from_search: boolean | null;
};

function textLen(...parts: Array<string | null | undefined>): number {
  return parts.reduce((n, p) => n + (p?.trim().length ?? 0), 0);
}

function hasImage(row: BusinessRow): boolean {
  return Boolean(
    row.hero_image?.trim() ||
      row.main_image?.trim() ||
      row.hero_image_url?.trim() ||
      row.main_image_url?.trim(),
  );
}

export type BusinessIndexabilityStats = {
  total: number;
  indexReady: number;
  missingText: number;
  missingImage: number;
  missingAddress: number;
  missingCategory: number;
  missingTown: number;
  hiddenFromSearch: number;
};

/** DB-side audit: listing fields that affect whether Google will index a business URL. */
export async function auditBusinessIndexability(
  supabase: SupabaseClient,
  baseUrl: string,
): Promise<{ issues: AuditIssue[]; stats: BusinessIndexabilityStats | null }> {
  const issues: AuditIssue[] = [];
  const stats: BusinessIndexabilityStats = {
    total: 0,
    indexReady: 0,
    missingText: 0,
    missingImage: 0,
    missingAddress: 0,
    missingCategory: 0,
    missingTown: 0,
    hiddenFromSearch: 0,
  };

  const rows: BusinessRow[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("businesses_view")
      .select(
        "slug, title, excerpt, content, address, hero_image, main_image, hero_image_url, main_image_url, primary_category_id, town_id, is_hidden_from_search",
      )
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .or(BROWSE_VISIBLE_NOT_HIDDEN)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      issues.push({
        severity: "warning",
        category: "data_quality",
        rule: "business_indexability_query_failed",
        detail: error.message,
      });
      return { issues, stats: null };
    }
    const batch = (data ?? []) as BusinessRow[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  stats.total = rows.length;
  const base = baseUrl.replace(/\/$/, "");

  for (const row of rows) {
    const slug = row.slug?.trim();
    if (!slug) continue;
    const url = `${base}/business/${encodeURIComponent(slug)}`;
    const name = row.title?.trim() || slug;

    const uniqueText = textLen(row.excerpt, row.content);
    const hasUniqueText = uniqueText >= MIN_UNIQUE_TEXT;
    const image = hasImage(row);
    const address = Boolean(row.address?.trim());
    const category = row.primary_category_id != null;
    const town = row.town_id != null;
    const hidden = row.is_hidden_from_search === true;

    if (!hasUniqueText) stats.missingText++;
    if (!image) stats.missingImage++;
    if (!address) stats.missingAddress++;
    if (!category) stats.missingCategory++;
    if (!town) stats.missingTown++;
    if (hidden) stats.hiddenFromSearch++;

    const ready = hasUniqueText && image && address && category && town && !hidden;
    if (ready) {
      stats.indexReady++;
      continue;
    }

    const gaps: string[] = [];
    if (!hasUniqueText) gaps.push(`unique text < ${MIN_UNIQUE_TEXT} chars`);
    if (!image) gaps.push("no hero/main image");
    if (!address) gaps.push("no address");
    if (!category) gaps.push("no category");
    if (!town) gaps.push("no town");
    if (hidden) gaps.push("hidden from search");

    issues.push({
      severity: hidden ? "notice" : "warning",
      category: "data_quality",
      rule: "business_not_index_ready",
      url,
      detail: `${name}: ${gaps.join("; ")}`,
    });
  }

  if (stats.total > 0) {
    const pct = Math.round((stats.indexReady / stats.total) * 100);
    issues.push({
      severity: pct < 50 ? "warning" : "notice",
      category: "data_quality",
      rule: "business_indexability_summary",
      detail: `${stats.indexReady}/${stats.total} listings index-ready (${pct}%): ${stats.missingText} missing text, ${stats.missingImage} missing image, ${stats.missingAddress} missing address`,
    });
  }

  return { issues, stats };
}
