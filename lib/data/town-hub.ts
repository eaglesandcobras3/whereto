import { getServiceSupabase } from "@/lib/supabase/service-role";
import { firstPlacePhotoProxyUrl } from "@/lib/media/place-photo";
import { searchIntentSchema } from "@/lib/intent-schema";
import { buildRecommendationSet } from "@/lib/search/recommendation-set";
import { loadLocationRankingScope } from "@/lib/search/location-scope";
import type { EnrichedRecommendationPayload } from "@/lib/search/recommendation-set";
import { fetchCachedEnrichedByQueryKey } from "@/lib/data/town-hub-cache";
import { townHubSectionKeys } from "@/lib/seo/query-cache-keys";

export type AdjacentTown = { name: string; slug: string };

export async function getTownBySlug(slug: string) {
  try {
    const supabase = getServiceSupabase();
    const { data } = await supabase
      .from("towns")
      .select("id, name, slug, region_id")
      .eq("slug", slug)
      .maybeSingle();
    return data as {
      id: number;
      name: string;
      slug: string;
      region_id: number | null;
    } | null;
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
      location: { town: townSlug, radius: "near" as const },
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
        google_photos,
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
        image_url: firstPlacePhotoProxyUrl(row.google_photos as string[] | null),
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

  return {
    topPicks,
    coffee,
    casualLunch,
    dateNight,
    kidFriendly,
    quickBites,
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
