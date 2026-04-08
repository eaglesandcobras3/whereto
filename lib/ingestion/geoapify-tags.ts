import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Map Geoapify / OSM category codes to existing `tags.slug` values (best-effort).
 */
const GEOAPIFY_CATEGORY_TO_TAG_SLUGS: Record<string, string[]> = {
  "catering.restaurant": ["dinner", "lunch"],
  "catering.fast_food": ["quick_bite", "lunch"],
  "catering.cafe": ["coffee", "breakfast"],
  "commercial.cafe": ["coffee", "breakfast"],
  "catering.bar": ["date_night"],
  "catering.pub": ["casual", "live_music"],
  "entertainment.tourism": ["family"],
  "leisure.park": ["outdoor_seating", "family"],
  "sport.fitness": ["groups"],
  "commercial.shopping_mall": ["groups"],
  "commercial.clothing": ["casual"],
  "commercial.beauty": ["romantic", "upscale"],
  "healthcare.clinic_or_praxis": [],
  "service.beauty": ["romantic"],
  "service.photography": ["romantic", "date_night"],
};

export async function resolveTagIdsForGeoapifyCategories(
  supabase: SupabaseClient,
  categories: string[] | undefined,
): Promise<number[]> {
  if (!categories?.length) return [];
  const wanted = new Set<string>();
  for (const c of categories) {
    const exact = GEOAPIFY_CATEGORY_TO_TAG_SLUGS[c];
    if (exact) {
      for (const s of exact) wanted.add(s);
      continue;
    }
    for (const [prefix, slugs] of Object.entries(GEOAPIFY_CATEGORY_TO_TAG_SLUGS)) {
      if (c.startsWith(prefix + ".") || c === prefix) {
        for (const s of slugs) wanted.add(s);
      }
    }
  }
  if (!wanted.size) return [];
  const { data: tagRows, error } = await supabase
    .from("tags")
    .select("id")
    .in("slug", [...wanted]);
  if (error || !tagRows?.length) return [];
  return tagRows.map((t) => t.id as number);
}
