import type { SupabaseClient } from "@supabase/supabase-js";
import { getAreaFactsBySlug } from "@/lib/data/area-facts-queries";
import { getAreaPlanningProfile } from "@/lib/data/area-planning";
import { DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import type { AreaIrseInput } from "../inputs";

export async function loadAreaIrseInput(
  supabase: SupabaseClient,
  slug: string,
): Promise<AreaIrseInput | null> {
  const key = slug.trim();

  const area = await loadFromView(supabase, "areas_view", key, "area");
  if (area) return area;

  return loadFromView(supabase, "points_of_interest_view", key, "poi");
}

async function loadFromView(
  supabase: SupabaseClient,
  view: "areas_view" | "points_of_interest_view",
  key: string,
  place_kind: "area" | "poi",
): Promise<AreaIrseInput | null> {
  const { data, error } = await supabase
    .from(view)
    .select(
      `
      id, slug, title, excerpt, content, seo_description, town_id,
      hero_image, main_image, hero_image_url, main_image_url, status
    `,
    )
    .eq("slug", key)
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as {
    id: string;
    slug: string | null;
    title: string | null;
    excerpt: string | null;
    content: string | null;
    seo_description: string | null;
    town_id: string | number | null;
    hero_image: string | null;
    main_image: string | null;
    hero_image_url: string | null;
    main_image_url: string | null;
    status: string | null;
  };

  const areaFacts =
    place_kind === "area" ? await getAreaFactsBySlug(key) : null;
  const planning = areaFacts ? null : getAreaPlanningProfile(key);
  const [listing_count, guide_count] = await Promise.all([
    countAreaListings(supabase, row.id, place_kind),
    countAreaGuides(supabase, row.id),
  ]);

  return {
    kind: "area",
    slug: row.slug ?? key,
    title: row.title,
    place_kind,
    excerpt: row.excerpt,
    content: row.content,
    seo_title: null,
    seo_description: row.seo_description,
    town_id: row.town_id,
    hero_image: row.hero_image,
    main_image: row.main_image,
    hero_image_url: row.hero_image_url,
    main_image_url: row.main_image_url,
    status: row.status,
    listing_count,
    guide_count,
    // Reuses planning_* IRSE fields for DB-backed area_facts (at a glance).
    has_planning_profile: areaFacts != null || planning != null,
    planning_faq_count:
      areaFacts?.details.length ?? planning?.faqs?.length ?? 0,
    planning_nearby_count:
      areaFacts?.highlights.length ??
      planning?.nearbyTowns?.length ??
      planning?.nearbyLinks?.length ??
      0,
  };
}

async function countAreaListings(
  supabase: SupabaseClient,
  areaId: string,
  place_kind: "area" | "poi",
): Promise<number> {
  if (place_kind === "poi") return 0;
  const byAreaId = await supabase
    .from("businesses_view")
    .select("id", { count: "exact", head: true })
    .eq("area_id", areaId)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .is("archived_at", null);
  if ((byAreaId.count ?? 0) > 0) return byAreaId.count ?? 0;

  const { count } = await supabase
    .from("area_businesses")
    .select("business_id", { count: "exact", head: true })
    .eq("area_id", areaId);
  return count ?? 0;
}

async function countAreaGuides(supabase: SupabaseClient, areaId: string): Promise<number> {
  const { count } = await supabase
    .from("guide_areas")
    .select("guide_id", { count: "exact", head: true })
    .eq("area_id", areaId);
  return count ?? 0;
}
