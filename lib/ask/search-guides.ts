import "server-only";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { editorialTextSearch } from "@/lib/ask/editorial-search";
import type { GuideResultCard } from "@/lib/ask/types";

export async function searchGuidesInDb(opts: {
  query: string;
  limit?: number;
}): Promise<GuideResultCard[]> {
  const supabase = getServiceSupabase();
  return editorialTextSearch({
    supabase,
    table: "guides_view",
    select: "id, title, slug, excerpt, hero_image_url, summary",
    query: opts.query,
    limit: opts.limit ?? 8,
    ilikeColumns: ["title", "excerpt", "summary", "search_keywords"],
    mapRow: mapGuideRow,
  });
}

function mapGuideRow(row: Record<string, unknown>): GuideResultCard {
  return {
    id: String(row.id),
    title: (row.title as string) ?? "Guide",
    slug: (row.slug as string) ?? String(row.id),
    excerpt: (row.excerpt as string) ?? (row.summary as string) ?? null,
    hero_image_url: (row.hero_image_url as string) ?? null,
    why_this_matched: "Matches your guide search",
  };
}
