import { getServiceSupabase } from "@/lib/supabase/service-role";
import { businessListingImageUrl } from "@/lib/media/place-photo";
import { searchIntentSchema } from "@/lib/intent-schema";
import {
  buildRecommendationSet,
  type EnrichedRecommendationPayload,
} from "@/lib/search/recommendation-set";
import { loadLocationRankingScope } from "@/lib/search/location-scope";
import { fetchCachedEnrichedByQueryKey } from "@/lib/data/town-hub-cache";
import { townHubSectionKeys } from "@/lib/seo/query-cache-keys";

/** Keep town hub carousels aligned with `businesses.town_id` (excludes adjacent-town matches from ranking). */
function filterEnrichedToAnchorTown(
  payload: EnrichedRecommendationPayload | null,
  anchorTownId: number,
): EnrichedRecommendationPayload | null {
  if (!payload?.recommendations?.length) return payload;
  const filtered = payload.recommendations.filter((rec) => {
    const tid = rec.business?.town_id;
    return typeof tid === "number" && tid === anchorTownId;
  });
  if (filtered.length === payload.recommendations.length) return payload;
  return {
    ...payload,
    recommendations: filtered.map((rec, i) => ({ ...rec, rank: i + 1 })),
  };
}

export type AdjacentTown = { name: string; slug: string };

export async function getTownBySlug(slug: string) {
  try {
    const supabase = getServiceSupabase();
    // 1. Fetch Town
    const { data: town, error: townErr } = await supabase
      .from("towns")
      .select("id, name, slug, region_id")
      .eq("slug", slug)
      .maybeSingle();
    
    if (townErr || !town) return null;

    // 2. Fetch Page content by slug
    const { data: page } = await supabase
      .from("pages")
      .select("body_markdown")
      .eq("slug", town.slug)
      .eq("status", "published")
      .maybeSingle();

    return {
      ...town,
      pages: page,
    };
  } catch {
    return null;
  }
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
  try {
    const supabase = getServiceSupabase();
    
    // 1. Get town meta
    const { data: town } = await supabase
      .from("towns")
      .select(`
        id,
        ai_tagline,
        ai_description,
        ai_vibe,
        ai_known_for,
        ai_best_for,
        ai_family_score,
        ai_romance_score,
        ai_nightlife_score,
        ai_budget_score,
        ai_must_see,
        ai_local_tips
      `)
      .eq("slug", slug)
      .maybeSingle();
      
    if (!town) return null;

    // 2. Get related guides
    const { data: guides } = await supabase
      .from("guides")
      .select("title, slug")
      .eq("primary_town_id", town.id)
      .limit(5);

    return {
      ...town,
      related_guides: guides ?? [],
    } as TownGuidePreview;
  } catch {
    return null;
  }
}

export async function getRegionBySlug(slug: string) {
  try {
    const supabase = getServiceSupabase();
    const { data } = await supabase
      .from("regions")
      .select("id, name, slug")
      .eq("slug", slug)
      .maybeSingle();
    return data as { id: number; name: string; slug: string } | null;
  } catch {
    return null;
  }
}

export type TownHubFeaturedRecommendation =
  EnrichedRecommendationPayload["recommendations"][number];

/** Merge category carousels into one ordered, de-duped list (restaurants → coffee → shopping). */
export function mergeTownFeaturedBusinessRecommendations(
  buckets: (EnrichedRecommendationPayload | null | undefined)[],
  maxItems = 12,
): TownHubFeaturedRecommendation[] {
  const seen = new Set<string>();
  const out: TownHubFeaturedRecommendation[] = [];
  for (const bucket of buckets) {
    if (!bucket?.recommendations?.length) continue;
    for (const rec of bucket.recommendations) {
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

/** Published guides tied to this town (entity graph first, then legacy `guides` + `pages`). */
export async function getFeaturedGuidesForTown(townId: number): Promise<TownFeaturedGuide[]> {
  try {
    const supabase = getServiceSupabase();

    const { data: ents } = await supabase
      .from("entities")
      .select("id")
      .eq("primary_town_id", townId)
      .eq("status", "published")
      .in("entity_type", ["guide", "seasonal_guide"])
      .limit(40);
    const entityIds = (ents ?? []).map((e) => e.id as string).filter(Boolean);
    if (entityIds.length > 0) {
      const { data: pages } = await supabase
        .from("pages")
        .select("slug, title, excerpt, og_image_url")
        .eq("page_type", "guide")
        .eq("status", "published")
        .in("entity_id", entityIds)
        .order("updated_at", { ascending: false })
        .limit(8);
      if (pages?.length) return pages as TownFeaturedGuide[];
    }

    const { data: guideRows } = await supabase
      .from("guides")
      .select("slug, title, featured, seo_priority")
      .eq("primary_town_id", townId)
      .order("featured", { ascending: false })
      .order("seo_priority", { ascending: false })
      .limit(16);
    if (!guideRows?.length) return [];

    const slugs = [...new Set(guideRows.map((g) => g.slug as string).filter(Boolean))];
    const { data: pages } = await supabase
      .from("pages")
      .select("slug, title, excerpt, og_image_url")
      .eq("page_type", "guide")
      .eq("status", "published")
      .in("slug", slugs);
    const pageBySlug = new Map(
      (pages ?? []).map((p) => [p.slug as string, p as TownFeaturedGuide]),
    );

    const out: TownFeaturedGuide[] = [];
    for (const g of guideRows) {
      const slug = g.slug as string;
      const row = pageBySlug.get(slug);
      if (row) out.push(row);
      if (out.length >= 8) break;
    }
    return out;
  } catch {
    return [];
  }
}

const AREA_TYPE_POINT_OF_INTEREST = "point_of_interest";

export type TownAreaBrowseRow = {
  id: number;
  name: string;
  slug: string;
  area_type: string;
  description_short: string | null;
};

/** Areas in this town: districts / shopping areas vs landmarks & parks (`point_of_interest`). */
export async function getTownAreasForLocalGuide(townId: number): Promise<{
  districts: TownAreaBrowseRow[];
  pointsOfInterest: TownAreaBrowseRow[];
}> {
  try {
    const supabase = getServiceSupabase();
    const { data } = await supabase
      .from("areas")
      .select("id, name, slug, area_type, description_short")
      .eq("town_id", townId)
      .order("name");
    const rows = (data ?? []) as TownAreaBrowseRow[];
    const districts = rows.filter((r) => r.area_type !== AREA_TYPE_POINT_OF_INTEREST);
    const pointsOfInterest = rows.filter((r) => r.area_type === AREA_TYPE_POINT_OF_INTEREST);
    return { districts, pointsOfInterest };
  } catch {
    return { districts: [], pointsOfInterest: [] };
  }
}

export async function getAdjacentTownNames(townId: number): Promise<AdjacentTown[]> {
  try {
    const supabase = getServiceSupabase();
    const { data: edges } = await supabase
      .from("town_adjacency")
      .select("town_id_a, town_id_b")
      .or(`town_id_a.eq.${townId},town_id_b.eq.${townId}`);
    const ids = new Set<number>();
    for (const e of edges ?? []) {
      const a = e.town_id_a as number;
      const b = e.town_id_b as number;
      ids.add(a === townId ? b : a);
    }
    if (!ids.size) return [];
    const { data: towns } = await supabase
      .from("towns")
      .select("name, slug")
      .in("id", [...ids]);
    return (towns ?? []) as AdjacentTown[];
  } catch {
    return [];
  }
}

async function picksForIntent(
  townSlug: string,
  categorySlug: string,
  rawLabel: string,
  options?: {
    attributes?: string[];
    resultCount?: number;
    limit?: number;
  },
): Promise<EnrichedRecommendationPayload | null> {
  try {
    const supabase = getServiceSupabase();
    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    const openaiKey = process.env.OPENAI_API_KEY;
    const resultCount = options?.resultCount ?? 8;
    const limit = options?.limit ?? resultCount;
    const intent = searchIntentSchema.parse({
      category: categorySlug,
      subcategory: null,
      location: { town: townSlug, radius: "exact" as const },
      attributes: options?.attributes ?? [],
      exclude_attributes: [],
      sort_preference: "quality",
      price_level: null,
      result_count: resultCount,
    });
    const { scope } = await loadLocationRankingScope(supabase, townSlug);
    const { enriched } = await buildRecommendationSet({
      supabase,
      rawQuery: rawLabel,
      normalizedQuery: rawLabel.toLowerCase(),
      intent,
      userId: null,
      model,
      openaiKey,
      locationScope: scope,
      limit,
    });
    return enriched;
  } catch {
    return null;
  }
}

export async function getTownHubSections(townSlug: string) {
  const [restaurants, coffee] = await Promise.all([
    picksForIntent(townSlug, "restaurants", `restaurants in ${townSlug}`),
    picksForIntent(townSlug, "coffee_shops", `coffee in ${townSlug}`),
  ]);
  return { restaurants, coffee };
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

function tagsFromBusinessRow(
  business_tags:
    | { tags: { slug: string } | { slug: string }[] | null }[]
    | null
    | undefined,
): string[] {
  const out: string[] = [];
  for (const bt of business_tags ?? []) {
    const t = bt.tags;
    if (!t) continue;
    if (Array.isArray(t)) {
      for (const x of t) {
        if (x?.slug) out.push(x.slug);
      }
    } else if (typeof t === "object" && "slug" in t && t.slug) {
      out.push(t.slug);
    }
  }
  return [...new Set(out)];
}

/** Preview listings from adjacent towns (DB-only, no AI) for “worth the short drive”. */
export async function getAdjacentTownBusinessPreviews(
  townId: number,
  limit = 10,
): Promise<AdjacentBusinessPreview[]> {
  try {
    const supabase = getServiceSupabase();
    const { data: edges } = await supabase
      .from("town_adjacency")
      .select("town_id_a, town_id_b")
      .or(`town_id_a.eq.${townId},town_id_b.eq.${townId}`);
    const adjacentIds = new Set<number>();
    for (const e of edges ?? []) {
      const a = e.town_id_a as number;
      const b = e.town_id_b as number;
      adjacentIds.add(a === townId ? b : a);
    }
    if (!adjacentIds.size) return [];
    const { data: rows } = await supabase
      .from("businesses")
      .select(
        `
        id,
        slug,
        name,
        ai_summary,
        hero_image_url,
        engagement_score,
        towns(name, slug),
        business_tags(tags(slug))
      `,
      )
      .in("town_id", [...adjacentIds])
      .eq("status", "active")
      .eq("admin_suppressed", false)
      .eq("suspected_closed", false)
      .gte("confidence_score", 0.35)
      .order("engagement_score", { ascending: false })
      .limit(limit);

    const out: AdjacentBusinessPreview[] = [];
    for (const row of rows ?? []) {
      const rawTown = row.towns as
        | { name: string; slug: string }
        | { name: string; slug: string }[]
        | null;
      const t = Array.isArray(rawTown) ? rawTown[0] : rawTown;
      if (!t?.slug) continue;
      out.push({
        id: row.id as string,
        slug: row.slug as string,
        name: row.name as string,
        ai_summary: (row.ai_summary as string | null) ?? null,
        townName: t.name,
        townSlug: t.slug,
        tagSlugs: tagsFromBusinessRow(
          row.business_tags as Parameters<typeof tagsFromBusinessRow>[0],
        ),
        image_url: businessListingImageUrl(row.hero_image_url as string | null),
      });
    }
    return out;
  } catch {
    return [];
  }
}

/** Rich town hub: prefer precomputed `query_cache` rows, then live AI fallback. */
export async function getTownHubExpandedSections(townSlug: string, townName: string) {
  const supabase = getServiceSupabase();
  const { data: anchorRow } = await supabase
    .from("towns")
    .select("id")
    .eq("slug", townSlug)
    .maybeSingle();
  const anchorTownId = anchorRow?.id as number | undefined;

  const keys = townHubSectionKeys(townSlug);

  async function fromCacheOrLive(
    queryKey: string,
    live: () => Promise<EnrichedRecommendationPayload | null>,
  ): Promise<EnrichedRecommendationPayload | null> {
    const cached = await fetchCachedEnrichedByQueryKey(supabase, queryKey);
    if (cached) return cached;
    return live();
  }

  const [
    topPicks,
    coffee,
    shopping,
    casualLunch,
    dateNight,
    kidFriendly,
    quickBites,
  ] = await Promise.all([
    fromCacheOrLive(keys.topPicks, () =>
      picksForIntent(townSlug, "restaurants", `best restaurants in ${townName}`, {
        resultCount: 8,
        limit: 8,
      }),
    ),
    fromCacheOrLive(keys.coffee, () =>
      picksForIntent(townSlug, "coffee_shops", `best coffee in ${townName}`, {
        resultCount: 8,
        limit: 8,
      }),
    ),
    fromCacheOrLive(keys.shopping, () =>
      picksForIntent(townSlug, "shopping", `shopping in ${townName}`, {
        resultCount: 8,
        limit: 8,
      }),
    ),
    fromCacheOrLive(keys.casualLunch, () =>
      picksForIntent(townSlug, "restaurants", `casual lunch in ${townName}`, {
        attributes: ["lunch"],
        resultCount: 8,
        limit: 8,
      }),
    ),
    fromCacheOrLive(keys.dateNight, () =>
      picksForIntent(townSlug, "restaurants", `date night dinner in ${townName}`, {
        attributes: ["date_night"],
        resultCount: 8,
        limit: 8,
      }),
    ),
    fromCacheOrLive(keys.kidFriendly, () =>
      picksForIntent(townSlug, "restaurants", `kid-friendly restaurants in ${townName}`, {
        attributes: ["kid_friendly"],
        resultCount: 8,
        limit: 8,
      }),
    ),
    fromCacheOrLive(keys.quickBites, () =>
      picksForIntent(townSlug, "restaurants", `quick bites in ${townName}`, {
        attributes: ["quick_bite"],
        resultCount: 8,
        limit: 8,
      }),
    ),
  ]);

  const scopeToAnchor = (p: EnrichedRecommendationPayload | null) =>
    anchorTownId != null ? filterEnrichedToAnchorTown(p, anchorTownId) : p;

  return {
    topPicks: scopeToAnchor(topPicks),
    coffee: scopeToAnchor(coffee),
    shopping: scopeToAnchor(shopping),
    casualLunch: scopeToAnchor(casualLunch),
    dateNight: scopeToAnchor(dateNight),
    kidFriendly: scopeToAnchor(kidFriendly),
    quickBites: scopeToAnchor(quickBites),
  };
}

export async function getTownsInRegion(regionId: number) {
  try {
    const supabase = getServiceSupabase();
    const { data } = await supabase
      .from("towns")
      .select("name, slug")
      .eq("region_id", regionId)
      .order("name");
    return (data ?? []) as AdjacentTown[];
  } catch {
    return [];
  }
}
