import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { isGuideEligibleForSitemap } from "@/lib/seo/sitemap-guide-eligibility";

const PAGE_SIZE = 1000;

/** Guide rows eligible for `/guide/[slug]` URLs in the sitemap. */
export async function fetchSitemapGuides(
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
    out.push(...batch.filter((row) => isGuideEligibleForSitemap(row)));
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return out;
}
