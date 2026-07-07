import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingRelationError } from "@/lib/postgrest-errors";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { isGuideEligibleForSitemap } from "@/lib/seo/sitemap-guide-eligibility";

const PAGE_SIZE = 1000;

/** Slugs archived (or draft) in `content_entries` — exclude even if `guides` row is stale. */
export async function fetchArchivedGuideContentEntrySlugs(
  supabase: SupabaseClient,
): Promise<Set<string>> {
  const slugs = new Set<string>();
  for (const status of ["archived", "draft"] as const) {
    const { data, error } = await supabase
      .from("content_entries")
      .select("slug")
      .eq("content_type", "guide")
      .eq("status", status);
    if (error) {
      if (isMissingRelationError(error)) return slugs;
      console.error(`sitemap: content_entries (${status})`, error);
      continue;
    }
    for (const row of data ?? []) {
      const s = String((row as { slug: string }).slug ?? "").trim();
      if (s) slugs.add(s);
    }
  }
  return slugs;
}

/** Guide rows eligible for `/guide/[slug]` URLs in the sitemap. */
export async function fetchSitemapGuides(
  supabase: SupabaseClient,
): Promise<Record<string, unknown>[]> {
  const [rows, archivedEntrySlugs] = await Promise.all([
    fetchBrowseableGuideRows(supabase),
    fetchArchivedGuideContentEntrySlugs(supabase),
  ]);

  if (archivedEntrySlugs.size === 0) return rows;

  return rows.filter((row) => isGuideEligibleForSitemap(row, archivedEntrySlugs));
}

async function fetchBrowseableGuideRows(
  supabase: SupabaseClient,
): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("guides")
      .select("slug, date_updated, published_at, date_created, status")
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .not("status", "eq", "archived")
      .not("status", "eq", "draft")
      .or(BROWSE_VISIBLE_NOT_HIDDEN)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error("sitemap: guides", error);
      break;
    }
    const batch = ((data ?? []) as unknown) as Record<string, unknown>[];
    out.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return out;
}
