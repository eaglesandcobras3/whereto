import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isBusinessSitemapEligible,
  type BusinessIndexReadinessFields,
} from "@/lib/seo/business-index-readiness";
import { DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";

const PAGE_SIZE = 1000;

type BusinessSitemapRow = Record<string, unknown> & BusinessIndexReadinessFields;

export async function fetchSitemapBusinesses(
  supabase: SupabaseClient,
): Promise<Record<string, unknown>[]> {
  const businesses: BusinessSitemapRow[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("businesses_view")
      .select(
        "slug, excerpt, overview, content, address, hero_image, main_image, hero_image_url, main_image_url, primary_category_id, town_id",
      )
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .eq("is_storefront", true)
      .eq("is_explorable", true)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error("sitemap: businesses_view", error);
      break;
    }
    const batch = (data ?? []) as BusinessSitemapRow[];
    businesses.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return businesses.filter((row) => isBusinessSitemapEligible(row)).map((row) => ({ slug: row.slug }));
}
