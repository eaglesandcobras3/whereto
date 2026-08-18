import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicPlaceBySlug } from "@/lib/data/public-place-by-slug";
import { getCategorySectionsForPublicPlace } from "@/lib/data/place-category-sections";
import { DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";

export async function fetchSitemapAreaIntentRows(
  supabase: SupabaseClient,
): Promise<Record<string, unknown>[]> {
  const [areas, pois] = await Promise.all([
    supabase
      .from("areas")
      .select("slug, date_updated, published_at, date_created")
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS),
    supabase
      .from("points_of_interest")
      .select("slug, date_updated, published_at, date_created")
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS),
  ]);

  const placeRows = [...(areas.data ?? []), ...(pois.data ?? [])] as Array<Record<string, unknown>>;
  const out: Record<string, unknown>[] = [];

  for (const row of placeRows) {
    const slug = String(row.slug ?? "").trim();
    if (!slug) continue;
    const place = await getPublicPlaceBySlug(slug);
    if (!place) continue;
    const sections = await getCategorySectionsForPublicPlace(place);
    for (const section of sections) {
      if (!section.slug) continue;
      out.push({
        area_slug: place.slug,
        seo_slug: section.slug,
        date_updated: row.date_updated,
        published_at: row.published_at,
        date_created: row.date_created,
      });
    }
  }

  return out;
}
