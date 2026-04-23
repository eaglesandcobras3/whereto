import { getServiceSupabase } from "@/lib/supabase/service-role";
import { getPublicImageUrl } from "@/lib/media/public-image-url";
import { storefrontListingStatuses } from "@/lib/shop/public-listing-filters";
import type { EnrichedRecommendationPayload } from "@/lib/search/recommendation-set";

const AREA_TYPE_POI = "point_of_interest";

function emptyCarousel(_label: string): EnrichedRecommendationPayload {
  return {
    query: "",
    normalized_query: "",
    summary: "Browse /search to explore this town.",
    recommendations: [],
    suggestions: [],
  };
}

function filterToTown(
  p: EnrichedRecommendationPayload | null,
  anchorTownId: string,
): EnrichedRecommendationPayload | null {
  if (!p?.recommendations?.length) return p;
  const filtered = p.recommendations.filter((r) => {
    const tid = r.business?.town_id;
    if (tid == null) return true;
    return String(tid) === String(anchorTownId);
  });
  if (filtered.length === p.recommendations.length) return p;
  return { ...p, recommendations: filtered.map((rec, i) => ({ ...rec, rank: i + 1 })) };
}

export type AdjacentTown = { name: string; slug: string };

export async function getTownBySlug(slug: string) {
  const supabase = getServiceSupabase();
  const { data: town, error } = await supabase
    .from("towns")
    .select("id, title, slug, region_id, excerpt, content, main_image, hero_image, status")
    .eq("slug", slug)
    .in("status", storefrontListingStatuses())
    .is("archived_at", null)
    .or("is_hidden_from_search.is.null,is_hidden_from_search.eq.false")
    .maybeSingle();
  if (error || !town) return null;
  const t = town as {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    main_image: string | null;
    hero_image: string | null;
  };
  const heroThumb = getPublicImageUrl(t.main_image) ?? getPublicImageUrl(t.hero_image);
  return {
    ...t,
    name: t.title,
    hero_image_thumb_url: heroThumb,
    hero_image_wide_url: heroThumb,
    pages: null,
  } as const;
}

export type TownGuidePreview = {
  ai_tagline: string | null;
  ai_description: string | null;
  ai_vibe: string[] | null;
  ai_known_for: string[] | null;
  ai_best_for: string[] | null;
  ai_family_score: number | null;
  ai_romance_score: number | null;
  ai_nightlife_score: number | null;
  ai_budget_score: number | null;
  ai_must_see: string[] | null;
  ai_local_tips: string[] | null;
  related_guides?: Array<{ title: string; slug: string }>;
};

export async function getTownGuidePreview(slug: string): Promise<TownGuidePreview | null> {
  const supabase = getServiceSupabase();
  const { data: town } = await supabase
    .from("towns")
    .select("id, title, excerpt, content, intent_tags")
    .eq("slug", slug)
    .maybeSingle();
  if (!town) return null;
  const t = town as { id: string; title: string; excerpt: string | null; content: string | null };
  return {
    ai_tagline: t.excerpt,
    ai_description: t.content,
    ai_vibe: null,
    ai_known_for: null,
    ai_best_for: null,
    ai_family_score: null,
    ai_romance_score: null,
    ai_nightlife_score: null,
    ai_budget_score: null,
    ai_must_see: null,
    ai_local_tips: null,
    related_guides: [],
  };
}

export async function getRegionBySlug(slug: string) {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("regions")
    .select("id, title, slug, status")
    .eq("slug", slug)
    .in("status", ["published", "active"])
    .maybeSingle();
  if (!data) return null;
  const r = data as { id: string; title: string; slug: string };
  return { id: r.id, name: r.title, slug: r.slug };
}

export function mergeTownFeaturedBusinessRecommendations(
  buckets: (EnrichedRecommendationPayload | null | undefined)[],
  maxItems = 12,
) {
  const seen = new Set<string>();
  const out: EnrichedRecommendationPayload["recommendations"] = [];
  for (const bucket of buckets) {
    for (const rec of bucket?.recommendations ?? []) {
      if (seen.has(rec.business_id)) continue;
      seen.add(rec.business_id);
      out.push(rec);
      if (out.length >= maxItems) return out;
    }
  }
  return out;
}

export type TownFeaturedGuide = {
  slug: string;
  title: string;
  excerpt: string | null;
  og_image_url: string | null;
};

export async function getFeaturedGuidesForTown(townId: string): Promise<TownFeaturedGuide[]> {
  const supabase = getServiceSupabase();
  const { data: links } = await supabase.from("guide_towns").select("guide_id").eq("town_id", townId).limit(20);
  const gids = (links ?? []).map((l) => (l as { guide_id: string }).guide_id).filter(Boolean);
  if (!gids.length) return [];
  const { data: guides } = await supabase
    .from("guides")
    .select("slug, title, excerpt, main_image, hero_image, status")
    .in("id", gids)
    .in("status", ["published", "active"])
    .limit(8);
  return (guides ?? []).map((g) => {
    const row = g as { slug: string; title: string; excerpt: string | null; main_image: string | null; hero_image: string | null };
    return {
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt,
      og_image_url: getPublicImageUrl(row.main_image) ?? getPublicImageUrl(row.hero_image),
    };
  });
}

export type TownAreaBrowseRow = {
  id: string;
  name: string;
  slug: string;
  area_type: string;
  description_short: string | null;
};

export async function getTownAreasForLocalGuide(
  townId: string,
): Promise<{ districts: TownAreaBrowseRow[]; pointsOfInterest: TownAreaBrowseRow[] }> {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("areas")
    .select("id, title, slug, area_type, excerpt, town_id, status")
    .eq("town_id", townId)
    .in("status", ["published", "active"])
    .order("title");
  const rows = (data ?? []) as {
    id: string;
    title: string;
    slug: string;
    area_type: string | null;
    excerpt: string | null;
  }[];
  const mapped: TownAreaBrowseRow[] = rows.map((r) => ({
    id: r.id,
    name: r.title,
    slug: r.slug,
    area_type: r.area_type ?? "area",
    description_short: r.excerpt,
  }));
  return {
    districts: mapped.filter((r) => r.area_type !== AREA_TYPE_POI),
    pointsOfInterest: mapped.filter((r) => r.area_type === AREA_TYPE_POI),
  };
}

export async function getAdjacentTownNames(_townId: string): Promise<AdjacentTown[]> {
  return [];
}

export async function getTownHubSections(_townSlug: string) {
  return { restaurants: null, coffee: null };
}

export type AdjacentBusinessPreview = {
  id: string;
  slug: string;
  name: string;
  ai_summary: string | null;
  townName: string;
  townSlug: string;
  tagSlugs: string[];
  image_url: string | null;
};

export async function getAdjacentTownBusinessPreviews(
  _townId: string,
  _limit = 10,
): Promise<AdjacentBusinessPreview[]> {
  return [];
}

export async function getTownHubExpandedSections(townSlug: string, townName: string) {
  const supabase = getServiceSupabase();
  const { data: anchorRow } = await supabase.from("towns").select("id").eq("slug", townSlug).maybeSingle();
  const anchorId = (anchorRow as { id: string } | null)?.id;
  const mk = (_k: string) => emptyCarousel(_k);
  const raw = {
    topPicks: mk("topPicks"),
    coffee: mk("coffee"),
    shopping: mk("shopping"),
    casualLunch: mk("casualLunch"),
    dateNight: mk("dateNight"),
    kidFriendly: mk("kidFriendly"),
    quickBites: mk("quickBites"),
  };
  if (!anchorId) return raw;
  const scope = (p: EnrichedRecommendationPayload) => filterToTown(p, anchorId) ?? p;
  return {
    topPicks: scope({ ...raw.topPicks, summary: `Highlights in ${townName} (add listings in Directus and use Search).` }),
    coffee: scope(raw.coffee),
    shopping: scope(raw.shopping),
    casualLunch: scope(raw.casualLunch),
    dateNight: scope(raw.dateNight),
    kidFriendly: scope(raw.kidFriendly),
    quickBites: scope(raw.quickBites),
  };
}

export async function getTownsInRegion(regionId: string) {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("towns")
    .select("title, slug, status")
    .eq("region_id", regionId)
    .in("status", ["published", "active"])
    .order("title");
  return (data ?? []).map((t) => ({
    name: (t as { title: string }).title,
    slug: t.slug,
  })) as AdjacentTown[];
}

export type TownHubFeaturedRecommendation = EnrichedRecommendationPayload["recommendations"][number];
