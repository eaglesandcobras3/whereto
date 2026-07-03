import type { FacetTag, FacetTagFamily } from "@/lib/discovery-filters/filter-state";

const FAMILY_COLUMN: Record<FacetTagFamily, string> = {
  item_tags: "item_tags",
  search_tags: "search_tags",
  atmosphere_tags: "atmosphere_tags",
  occasion_tags: "occasion_tags",
  meal_period_tags: "meal_period_tags",
  dietary_tags: "dietary_tags",
};

/** PostgREST `or` clause: match any selected facet (OR across facets). */
export function buildFacetOrFilter(facetTags: FacetTag[]): string | null {
  if (!facetTags.length) return null;

  const parts: string[] = [];
  for (const tag of facetTags) {
    const col = FAMILY_COLUMN[tag.family];
    parts.push(`${col}.cs.{${tag.slug}}`);
  }
  return parts.join(",");
}

export function facetColumnForFamily(family: FacetTagFamily): string {
  return FAMILY_COLUMN[family];
}
