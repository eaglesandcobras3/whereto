import type { SupabaseClient } from "@supabase/supabase-js";
import {
  searchIntentSchema,
  validateAIResponse,
  type SearchIntent,
} from "@/lib/intent-schema";
import {
  scoreAndRankCandidates,
  type BusinessRowWithTags,
  type LocationRankingScope,
} from "@/lib/scoring";
import {
  fallbackIntentFromKeywords,
  parseIntentWithOpenAI,
  synthesizeWithOpenAI,
} from "@/lib/ai/search-ai";
import { loadLocationRankingScope } from "@/lib/search/location-scope";
import { businessListingImageUrl } from "@/lib/media/place-photo";

type DbBusinessRow = {
  id: string;
  slug?: string;
  name: string;
  address: string | null;
  town_id: number | null;
  category_id: number | null;
  categories: { name: string } | null;
  lat: number;
  lng: number;
  phone: string | null;
  website: string | null;
  price_level: number | null;
  ai_summary: string | null;
  status: string;
  suspected_closed: boolean;
  admin_suppressed: boolean;
  confidence_score: number;
  freshness_score: number;
  engagement_score: number;
  exploration_score: number;
  completeness_score: number;
  bad_experience_unique_users: number;
  listing_rating: number | null;
  listing_review_count: number | null;
  legacy_photo_refs?: string[] | null;
  hero_image_url?: string | null;
  business_tags: { tags: { slug: string } | { slug: string }[] | null }[] | null;
};

export function toBusinessWithTags(row: DbBusinessRow): BusinessRowWithTags & {
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  phone: string | null;
  website: string | null;
  price_level: number | null;
  ai_summary: string | null;
  category_name?: string;
} {
  const tag_slugs: string[] = [];
  for (const bt of row.business_tags ?? []) {
    const t = bt.tags;
    if (!t) continue;
    if (Array.isArray(t)) {
      for (const x of t) {
        if (x?.slug) tag_slugs.push(x.slug);
      }
    } else if (typeof t === "object" && "slug" in t && t.slug) {
      tag_slugs.push(t.slug);
    }
  }
  const {
    id,
    slug,
    name,
    address,
    town_id,
    category_id,
    categories,
    lat,
    lng,
    phone,
    website,
    price_level,
    ai_summary,
    status,
    suspected_closed,
    admin_suppressed,
    confidence_score,
    freshness_score,
    engagement_score,
    exploration_score,
    completeness_score,
    bad_experience_unique_users,
    listing_rating,
    listing_review_count,
    legacy_photo_refs: rowPhotos,
    hero_image_url: rowHeroUrl,
  } = row;
  return {
    id,
    slug,
    name,
    address,
    town_id,
    category_id,
    category_name: categories?.name,
    lat,
    lng,
    phone,
    website,
    price_level,
    ai_summary,
    status,
    suspected_closed,
    admin_suppressed,
    confidence_score,
    freshness_score,
    engagement_score,
    exploration_score,
    completeness_score,
    bad_experience_unique_users,
    listing_rating,
    listing_review_count,
    legacy_photo_refs: rowPhotos ?? null,
    hero_image_url: rowHeroUrl ?? null,
    tag_slugs,
  };
}

function templateResponse(candidates: BusinessRowWithTags[], intent: SearchIntent) {
  const top = candidates.slice(0, intent.result_count);
  return {
    recommendations: top.map((c, i) => ({
      business_id: c.id,
      rank: i + 1,
      headline: "Strong local pick",
      explanation:
        c.ai_summary?.slice(0, 280) ??
        `${c.name ?? "This spot"} is a listed 30A business that matches your search.`,
      highlighted_tags: c.tag_slugs.slice(0, 4),
    })),
    search_summary: `Found ${top.length} curated matches for you along 30A with WhereTo30A.`,
  };
}

export async function fetchActiveBusinessesWithTags(
  supabase: SupabaseClient,
): Promise<BusinessRowWithTags[]> {
  const { data: rawBusinesses, error: bizErr } = await supabase
    .from("businesses")
    .select(
      `
      id, slug, name, address, town_id, category_id, lat, lng, phone, website, price_level, ai_summary,
      status, suspected_closed, admin_suppressed,
      confidence_score, freshness_score, engagement_score, exploration_score, completeness_score,
      bad_experience_unique_users, listing_rating, listing_review_count, legacy_photo_refs, hero_image_url,
      business_tags(tags(slug)),
      categories(name)
    `,
    )
    .eq("status", "active")
    .limit(400);

  if (bizErr) throw bizErr;
  return (
    (rawBusinesses as unknown as DbBusinessRow[] | null)?.map(toBusinessWithTags) ?? []
  );
}

export async function loadSlugMaps(supabase: SupabaseClient): Promise<{
  townSlugToId: Map<string, number>;
  categorySlugToId: Map<string, number>;
}> {
  const [{ data: towns }, { data: categories }] = await Promise.all([
    supabase.from("towns").select("id, slug"),
    supabase.from("categories").select("id, slug"),
  ]);
  return {
    townSlugToId: new Map(
      (towns ?? []).map((t) => [t.slug as string, t.id as number]),
    ),
    categorySlugToId: new Map(
      (categories ?? []).map((c) => [c.slug as string, c.id as number]),
    ),
  };
}

export async function loadSuppressedIds(
  supabase: SupabaseClient,
  userId: string | null,
): Promise<Set<string>> {
  const suppressedIds = new Set<string>();
  if (!userId) return suppressedIds;
  const { data: sup } = await supabase
    .from("user_suppressions")
    .select("business_id")
    .eq("user_id", userId);
  for (const row of sup ?? []) {
    suppressedIds.add(row.business_id as string);
  }
  return suppressedIds;
}

export type EnrichedRecommendationPayload = {
  query: string;
  normalized_query: string;
  summary: string;
  recommendations: Array<{
    business_id: string;
    rank: number;
    headline: string;
    explanation: string;
    highlighted_tags: string[];
    business: Record<string, unknown>;
  }>;
  suggestions?: string[];
};

/**
 * Shared path: rank + AI/template synthesis + enrichment. Used by `runSearch` and crons.
 */
export async function buildRecommendationSet(options: {
  supabase: SupabaseClient;
  rawQuery: string;
  normalizedQuery: string;
  intent: SearchIntent;
  userId: string | null;
  model: string;
  openaiKey: string | undefined;
  locationScope: LocationRankingScope | null;
  limit?: number;
  priceLevel?: number;
}): Promise<{
  ranked: BusinessRowWithTags[];
  enriched: EnrichedRecommendationPayload;
  businessIds: string[];
}> {
  const { townSlugToId, categorySlugToId } = await loadSlugMaps(options.supabase);
  const suppressedIds = await loadSuppressedIds(
    options.supabase,
    options.userId,
  );
  const rows = await fetchActiveBusinessesWithTags(options.supabase);
  const limit = options.limit ?? 15;
  let ranked = scoreAndRankCandidates(
    rows,
    options.intent,
    townSlugToId,
    categorySlugToId,
    suppressedIds,
    limit,
    options.locationScope,
  );

  if (options.priceLevel) {
    ranked = ranked.filter((r) => r.price_level === options.priceLevel);
  }

  const candidateIds = new Set(ranked.map((r) => r.id));

  let aiParsed: unknown;
  if (options.openaiKey && ranked.length > 0) {
    try {
      aiParsed = await synthesizeWithOpenAI(
        options.model,
        options.openaiKey,
        options.rawQuery,
        options.intent,
        ranked,
      );
    } catch {
      aiParsed = templateResponse(ranked, options.intent);
    }
  } else {
    aiParsed = templateResponse(ranked, options.intent);
  }

  let validated = validateAIResponse(aiParsed, candidateIds);
  if (!validated.valid) {
    const tpl = templateResponse(ranked, options.intent);
    validated = validateAIResponse(tpl, candidateIds);
  }
  if (!validated.valid) {
    const empty = {
      recommendations: [] as {
        business_id: string;
        rank: number;
        headline: string;
        explanation: string;
        highlighted_tags: string[];
      }[],
      search_summary:
        ranked.length === 0
          ? "No active listings match yet. Try another town or category."
          : "We found matches but could not format them; please try again.",
    };
    validated = { valid: true, data: empty };
  }

  const byId = new Map(ranked.map((r) => [r.id, r]));
  const enriched: EnrichedRecommendationPayload = {
    query: options.rawQuery,
    normalized_query: options.normalizedQuery,
    summary: validated.data.search_summary,
    recommendations: validated.data.recommendations
      .sort((a, b) => a.rank - b.rank)
      .map((rec) => {
        const b = byId.get(rec.business_id);
        return {
          ...rec,
          business: b
            ? {
                id: b.id,
                name: b.name,
                address: b.address,
                town_id: b.town_id,
                category_id: b.category_id,
                lat: b.lat,
                lng: b.lng,
                phone: b.phone,
                website: b.website,
                price_level: b.price_level,
                slug: b.slug,
                listing_rating: b.listing_rating,
                listing_review_count: b.listing_review_count,
                tags: b.tag_slugs,
                ai_summary: b.ai_summary,
                category_name: b.category_name,
                image_url: businessListingImageUrl(b.hero_image_url ?? null),
              }
            : {
                id: rec.business_id,
                name: "Unknown",
              },
        };
      }),
    suggestions: validated.data.suggestions,
  };

  const businessIds = enriched.recommendations.map((r) => r.business_id);
  return { ranked, enriched, businessIds };
}

/** Parse intent from raw text (OpenAI or keyword fallback). */
export async function resolveIntent(
  rawQuery: string,
  normalized: string,
  model: string,
  openaiKey: string | undefined,
): Promise<SearchIntent> {
  let intent: SearchIntent;
  try {
    if (openaiKey) {
      intent = await parseIntentWithOpenAI(model, openaiKey, normalized);
    } else {
      intent = fallbackIntentFromKeywords(normalized);
    }
  } catch {
    intent = fallbackIntentFromKeywords(normalized);
  }
  return searchIntentSchema.parse(intent);
}

export async function resolveLocationScopeForIntent(
  supabase: SupabaseClient,
  intent: SearchIntent,
): Promise<LocationRankingScope | null> {
  const town = intent.location?.town;
  if (!town) return null;
  const { scope } = await loadLocationRankingScope(supabase, town);
  return scope;
}
