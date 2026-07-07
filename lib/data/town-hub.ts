import { getServiceSupabase } from "@/lib/supabase/service-role";
import { getPublicImageUrl, getPublicImageUrlWithView } from "@/lib/media/public-image-url";
import {
  BROWSE_VISIBLE_NOT_HIDDEN,
  DIRECTUS_PUBLISHED_STATUS,
} from "@/lib/shop/public-listing-filters";
import { normalizeUrlSegment } from "@/lib/routes/url-slug";
import type { EnrichedRecommendationPayload } from "@/lib/search/recommendation-set";

/** Town hub: browse row for an `areas` table record (links to `/area/[slug]`). */
export type TownAreaBrowseRow = {
  id: string;
  name: string;
  slug: string;
  area_type: string;
  description_short: string | null;
};

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
  const key = normalizeUrlSegment(slug);
  if (!key) return null;

  const supabase = getServiceSupabase();
  // Town *hub* is a direct URL, not the search index. Match any non-archived row by slug.
  // (`is_hidden_from_search` is for /search, lists, sitemap — not for /{slug} where someone
  // has a permalink. Your SQL in the editor often omits the hide filter; the old query
  // could return zero rows even when a row existed.)
  // `towns_view` adds `main_image_url` / `hero_image_url` via `resolve_directus_file_url` → Supabase Storage
  const { data: rows, error } = await supabase
    .from("towns_view")
    .select("id, title, slug, region, excerpt, content, main_image, hero_image, status, main_image_url, hero_image_url, seo_title, seo_description")
    .eq("slug", key)
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .limit(1);

  if (error) {
     
    console.error("getTownBySlug", { slug: key, error });
    return null;
  }
  const town = rows?.[0] ?? null;
  if (!town) return null;
  const t = town as {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    content: string | null;
    main_image: string | null;
    hero_image: string | null;
    main_image_url: string | null;
    hero_image_url: string | null;
  };
  const heroThumb = getPublicImageUrlWithView(
    t.main_image_url,
    t.hero_image_url,
    t.main_image,
    t.hero_image,
  );
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
  const key = normalizeUrlSegment(slug);
  if (!key) return null;
  const supabase = getServiceSupabase();
  const { data: town } = await supabase
    .from("towns")
    .select("id, title, excerpt, content, intent_tags")
    .eq("slug", key)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .is("archived_at", null)
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

export type TownGuideCard = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  hero_image_url: string | null;
};

const GUIDE_VIEW_SELECT =
  "id, slug, title, excerpt, seo_description, guide_type, main_image, hero_image, main_image_url, hero_image_url";

function mapTownGuideRow(row: Record<string, unknown>): TownGuideCard {
  const heroUrl = getPublicImageUrlWithView(
    row.main_image_url as string | null,
    row.hero_image_url as string | null,
    row.main_image as string | null,
    row.hero_image as string | null,
  );
  const excerpt = (row.excerpt as string | null) ?? null;
  const seo = (row.seo_description as string | null) ?? null;
  const guideType = (row.guide_type as string | null) ?? null;
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String((row as { title: string }).title),
    subtitle:
      excerpt?.trim() ||
      seo?.trim() ||
      (guideType ? guideType.replace(/_/g, " ") : null),
    hero_image_url: heroUrl,
  };
}

/** Guides linked via `guide_towns` for this town. */
export async function getGuidesForTown(townId: string): Promise<TownGuideCard[]> {
  const supabase = getServiceSupabase();

  const linksRes = await supabase.from("guide_towns").select("guide_id").eq("town_id", townId);

  const linkedIds = [
    ...new Set(
      (linksRes.data ?? [])
        .map((r) => String((r as { guide_id: string }).guide_id))
        .filter(Boolean),
    ),
  ];

  if (linkedIds.length === 0) return [];

  const { data: linked } = await supabase
    .from("guides")
    .select(GUIDE_VIEW_SELECT)
    .in("id", linkedIds)
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN);

  const guideById = new Map<string, TownGuideCard>();
  for (const row of linked ?? []) {
    const g = mapTownGuideRow(row as Record<string, unknown>);
    guideById.set(g.id, g);
  }

  return [...guideById.values()].sort((a, b) => a.title.localeCompare(b.title));
}

export async function getFeaturedGuidesForTown(townId: string): Promise<TownFeaturedGuide[]> {
  const guides = await getGuidesForTown(townId);
  return guides.slice(0, 8).map((g) => ({
    slug: g.slug,
    title: g.title,
    excerpt: g.subtitle,
    og_image_url: g.hero_image_url,
  }));
}

/**
 * All listable `areas` for a town. `points_of_interest` is a separate product surface;
 * the town hub only lists the `areas` table for now.
 */
export async function getTownAreasForLocalGuide(
  townId: string,
): Promise<{ districts: TownAreaBrowseRow[]; pointsOfInterest: TownAreaBrowseRow[] }> {
  const supabase = getServiceSupabase();

  const { data: areaData } = await supabase
    .from("areas")
    .select("id, title, slug, area_type, excerpt, town_id, status")
    .eq("town_id", townId)
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .order("title");

  const districts: TownAreaBrowseRow[] = (areaData ?? []).map((r) => {
    const row = r as {
      id: string;
      title: string;
      slug: string;
      area_type: string | null;
      excerpt: string | null;
    };
    return {
      id: row.id,
      name: row.title,
      slug: row.slug,
      area_type: row.area_type ?? "area",
      description_short: row.excerpt,
    };
  });

  return { districts, pointsOfInterest: [] };
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
  // `towns.region_id` (uuid FK) is the source of truth; legacy `region` is a string field.
  const { data } = await supabase
    .from("towns")
    .select("title, slug, status")
    .eq("region_id", regionId)
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .order("title");
  return (data ?? []).map((t) => ({
    name: (t as { title: string }).title,
    slug: t.slug,
  })) as AdjacentTown[];
}

export type TownHubFeaturedRecommendation = EnrichedRecommendationPayload["recommendations"][number];
