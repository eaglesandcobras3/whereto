import "server-only";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { editorialTextSearch } from "@/lib/ask/editorial-search";
import type { TownResultCard } from "@/lib/ask/types";

export async function searchTownsInDb(opts: {
  query: string;
  limit?: number;
}): Promise<TownResultCard[]> {
  const supabase = getServiceSupabase();
  return editorialTextSearch({
    supabase,
    table: "towns_view",
    select: "id, title, slug, excerpt, hero_image_url, region",
    query: opts.query,
    limit: opts.limit ?? 6,
    ilikeColumns: ["title", "excerpt", "search_keywords", "region"],
    mapRow: mapTownRow,
  });
}

function mapTownRow(row: Record<string, unknown>): TownResultCard {
  return {
    id: String(row.id),
    title: (row.title as string) ?? "Town",
    slug: (row.slug as string) ?? String(row.id),
    excerpt: (row.excerpt as string) ?? null,
    hero_image_url: (row.hero_image_url as string) ?? null,
    region: (row.region as string) ?? null,
    why_this_matched: "Matches town guide content on WhereTo30A",
  };
}
