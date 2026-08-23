import "server-only";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { editorialTextSearch } from "@/lib/ask/editorial-search";
import type { AreaResultCard } from "@/lib/ask/types";
import { AREAS_HUB_INCLUDE_OR_FILTER } from "@/lib/places/hub-browse-visibility";

export async function searchAreasInDb(opts: {
  query: string;
  limit?: number;
}): Promise<AreaResultCard[]> {
  const supabase = getServiceSupabase();
  return editorialTextSearch({
    supabase,
    table: "areas_view",
    select: "id, title, slug, excerpt, hero_image_url, area_type",
    query: opts.query,
    limit: opts.limit ?? 6,
    ilikeColumns: ["title", "excerpt", "search_keywords", "area_type"],
    hubBrowseOrFilter: AREAS_HUB_INCLUDE_OR_FILTER,
    mapRow: mapAreaRow,
  });
}

function mapAreaRow(row: Record<string, unknown>): AreaResultCard {
  return {
    id: String(row.id),
    title: (row.title as string) ?? "Area",
    slug: (row.slug as string) ?? String(row.id),
    excerpt: (row.excerpt as string) ?? null,
    hero_image_url: (row.hero_image_url as string) ?? null,
    area_type: (row.area_type as string) ?? null,
    why_this_matched: "Matches area guide content on WhereTo30A",
  };
}
