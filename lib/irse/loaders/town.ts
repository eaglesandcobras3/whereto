import type { SupabaseClient } from "@supabase/supabase-js";
import {
  parseTownFacts,
  TOWN_FACTS_SELECT,
  type TownFactsRow,
} from "@/lib/data/town-facts";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import {
  isTemplatedTownSeoTitle,
  jaccardOverlap,
  overlapTokens,
} from "../content-overlap";
import type { TownIrseInput } from "../inputs";

export async function loadTownIrseInput(
  supabase: SupabaseClient,
  slug: string,
): Promise<TownIrseInput | null> {
  const key = slug.trim();
  const { data, error } = await supabase
    .from("towns_view")
    .select(
      `
      id, slug, title, excerpt, content, seo_title, seo_description,
      hero_image, main_image, hero_image_url, main_image_url, status
    `,
    )
    .eq("slug", key)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as {
    id: string;
    slug: string | null;
    title: string | null;
    excerpt: string | null;
    content: string | null;
    seo_title: string | null;
    seo_description: string | null;
    hero_image: string | null;
    main_image: string | null;
    hero_image_url: string | null;
    main_image_url: string | null;
    status: string | null;
  };

  const [listing_count, guide_count, area_count, content_overlap_max, townFacts] =
    await Promise.all([
      countTownListings(supabase, row.id),
      countTownGuides(supabase, row.id),
      countTownAreas(supabase, row.id),
      maxContentOverlap(supabase, key, row.excerpt, row.content),
      loadTownFacts(supabase, key),
    ]);

  return {
    kind: "town",
    slug: row.slug ?? key,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    seo_title: row.seo_title,
    seo_description: row.seo_description,
    hero_image: row.hero_image,
    main_image: row.main_image,
    hero_image_url: row.hero_image_url,
    main_image_url: row.main_image_url,
    status: row.status,
    listing_count,
    guide_count,
    area_count,
    content_overlap_max,
    seo_title_templated: isTemplatedTownSeoTitle(row.seo_title),
    // Reuses planning_* IRSE fields for DB-backed town_facts (at a glance).
    has_planning_profile: townFacts != null,
    planning_faq_count: townFacts?.details.length ?? 0,
    planning_nearby_count: townFacts?.highlights.length ?? 0,
  };
}

async function loadTownFacts(supabase: SupabaseClient, slug: string) {
  const { data, error } = await supabase
    .from("towns")
    .select(TOWN_FACTS_SELECT)
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return parseTownFacts(data as TownFactsRow);
}

async function countTownListings(supabase: SupabaseClient, townId: string): Promise<number> {
  const { count } = await supabase
    .from("businesses_view")
    .select("id", { count: "exact", head: true })
    .eq("town_id", townId)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .is("archived_at", null);
  return count ?? 0;
}

async function countTownGuides(supabase: SupabaseClient, townId: string): Promise<number> {
  const { count } = await supabase
    .from("guide_towns")
    .select("guide_id", { count: "exact", head: true })
    .eq("town_id", townId);
  return count ?? 0;
}

async function countTownAreas(supabase: SupabaseClient, townId: string): Promise<number> {
  const { count } = await supabase
    .from("areas_view")
    .select("id", { count: "exact", head: true })
    .eq("town_id", townId)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .is("archived_at", null);
  return count ?? 0;
}

async function maxContentOverlap(
  supabase: SupabaseClient,
  slug: string,
  excerpt: string | null,
  content: string | null,
): Promise<number> {
  const self = overlapTokens([excerpt, content].filter(Boolean).join("\n"));
  if (self.size === 0) return 0;

  const { data } = await supabase
    .from("towns_view")
    .select("slug, excerpt, content")
    .neq("slug", slug)
    .limit(50);

  let max = 0;
  for (const row of data ?? []) {
    const other = row as { excerpt: string | null; content: string | null };
    const j = jaccardOverlap(
      self,
      overlapTokens([other.excerpt, other.content].filter(Boolean).join("\n")),
    );
    if (j > max) max = j;
  }
  return Math.round(max * 1000) / 1000;
}
