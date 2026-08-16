import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicImageUrlWithView } from "@/lib/media/public-image-url";
import {
  computeCompositeWithBreakdown,
  type ScoringIntent,
  type ScoreBreakdown,
} from "@/lib/search/scoring";
import {
  applyHybridVectorPostRanking,
  DEFAULT_SEARCH_RANK_CONFIG,
  isApparelFashionRetailQuery,
  isMinimalApparelRetailKeywordQuery,
  type HybridVectorPostRankingInput,
  type ScoredVecRow,
} from "@/lib/search/hybrid-vector-postprocess";
import { resolveIlikeOrClause } from "@/lib/search/ilike-text-search";
import { rowMatchesVibeTags } from "@/lib/search/vibe-tag-filter";
import { getSearchQueryEmbedding } from "@/lib/search/query-embedding";
import { loadLearningBoostMap } from "@/lib/search/learning-boost";
import { deriveQueryClusterKey } from "@/lib/search/query-cluster";
import {
  DIRECTUS_PUBLISHED_STATUS,
} from "@/lib/shop/public-listing-filters";
import type {
  BusinessPayload,
  SearchConfidence,
  SearchResultPayload,
  SearchRetrievalMetrics,
  SearchRetrievalPath,
} from "@/lib/search/types";
import type { SearchCandidateRankOrder } from "@/lib/scoring";

// ---------------------------------------------------------------------------
// Confidence scoring
// ---------------------------------------------------------------------------

function computeSearchConfidence(
  retrieval: SearchRetrievalMetrics,
  topComposite: number,
  totalResults: number,
  avgDataQuality: number,
  hasCategory: boolean,
  hasLocation: boolean,
): SearchConfidence {
  let score = 1.0;
  const reasons: string[] = [];

  if (retrieval.path === "ilike" || retrieval.path === "browse_no_text") {
    score -= 0.2;
    reasons.push("no vector search — keyword fallback only");
  }
  if (topComposite < 0.45 && topComposite > 0) {
    score -= 0.15;
    reasons.push("low top composite score");
  }
  if (totalResults < 3) {
    score -= 0.15;
    reasons.push("fewer than 3 results");
  }
  if (!hasCategory) {
    score -= 0.1;
    reasons.push("no category detected");
  }
  if (!hasLocation) {
    score -= 0.1;
    reasons.push("no location detected");
  }
  if (avgDataQuality < 0.5) {
    score -= 0.1;
    reasons.push("low average data quality");
  }

  return { score: Math.max(0, Math.round(score * 100) / 100), low_confidence_reasons: reasons };
}

// ---------------------------------------------------------------------------
// Business payload builder
// ---------------------------------------------------------------------------

function businessPayload(
  row: Record<string, unknown>,
  imageUrl: string | null,
): BusinessPayload {
  const displayName = String((row as { title?: string; name?: string }).title ?? row.name ?? "");
  const t = row.towns as { title?: string; slug?: string } | { title?: string; slug?: string }[] | null;
  const townOne = t && Array.isArray(t) ? t[0] : t;
  return {
    id: String(row.id),
    name: displayName,
    slug: row.slug != null ? String(row.slug) : undefined,
    address: (row.address as string | null) ?? null,
    town_id: null,
    town_name: townOne?.title ?? null,
    category_id: null,
    category_name: undefined,
    lat: row.map_lat != null ? Number(row.map_lat) : undefined,
    lng: row.map_lng != null ? Number(row.map_lng) : undefined,
    phone: (row.phone as string | null) ?? null,
    website: (row.website as string | null) ?? null,
    price_level: null,
    listing_rating: row.review_rating_cached != null ? Number(row.review_rating_cached) : null,
    listing_review_count: row.review_count_cached != null ? Number(row.review_count_cached) : null,
    tags: undefined,
    ai_summary: (row.excerpt as string | null) ?? (row.content as string | null)?.slice(0, 500) ?? null,
    image_url: imageUrl,
    hero_image_url: imageUrl,
    has_physical_location: row.map_lat != null && row.map_lng != null,
  };
}

function rowToRec(row: Record<string, unknown>, rank: number): SearchResultPayload["recommendations"][number] {
  const r = row as {
    main_image?: string | null;
    hero_image?: string | null;
    main_image_url?: string | null;
    hero_image_url?: string | null;
  };
  const img = getPublicImageUrlWithView(r.main_image_url, r.hero_image_url, r.main_image, r.hero_image);
  const categories = row.business_categories as { title?: string; slug?: string } | null;
  const bp = businessPayload(row, img);
  if (categories?.title) bp.category_name = categories.title;
  return {
    business_id: String(row.id),
    rank,
    headline: String((row as { title?: string }).title ?? "Listing"),
    explanation: (row.excerpt as string | null) ?? "",
    highlighted_tags: [],
    business: bp,
  };
}

// ---------------------------------------------------------------------------
// Options type
// ---------------------------------------------------------------------------

type MinimalSearchBuildOptions = {
  rawQuery: string;
  normalizedQuery: string;
  queryHash: string;
  model: string;
  openaiKey: string | undefined;
  precomputedQueryEmbedding?: number[] | null;
  page?: number;
  pageSize?: number;
  constrainTownId?: string;
  nearTownIds?: string[];
  constrainAreaId?: string;
  requiredHasPhysicalLocation?: boolean;
  requiredIsServiceBusiness?: boolean;
  sortMode?: SearchCandidateRankOrder;
  primaryCategoryId?: string | null;
  explicitCategoryId?: string | null;
  pageBrowseWithoutQuery?: boolean;
  skipIlikeTextFilter?: boolean;
  searchTermOverride?: string;
  constrainPriceBucket?: "inexpensive" | "moderate" | "expensive" | null;
  primaryCategoryIds?: string[];
  explicitServiceCategoryId?: string | null;
  primaryServiceCategoryIds?: string[];
  constrainVibeTags?: string[];
  intentCategory?: string | null;
  intentSpecificItems?: string[];
  intentDietaryNeeds?: string[];
  intentMealPeriod?: string | null;
  intentAtmosphereNeeds?: string[];
  intentOccasion?: string | null;
  /** User coordinates for geo-distance scoring. */
  userLat?: number | null;
  userLng?: number | null;
};

// ---------------------------------------------------------------------------
// Sidebar filter
// ---------------------------------------------------------------------------

function filterRowsBySidebar(rows: ScoredVecRow[], options: MinimalSearchBuildOptions): ScoredVecRow[] {
  let filtered = rows;
  if (typeof options.requiredIsServiceBusiness === "boolean") {
    filtered = filtered.filter((r) => Boolean(r.is_service_business) === options.requiredIsServiceBusiness);
  }
  if (options.constrainPriceBucket) {
    filtered = filtered.filter((r) => {
      const p = Number(r.price_level);
      if (options.constrainPriceBucket === "inexpensive") return p === 1 || p === 2;
      if (options.constrainPriceBucket === "moderate") return p === 2 || p === 3;
      return p === 3 || p === 4;
    });
  }
  if (options.primaryCategoryIds?.length) {
    filtered = filtered.filter((r) => options.primaryCategoryIds!.includes(String(r.primary_category_id)));
  } else if (options.primaryCategoryId) {
    filtered = filtered.filter((r) => String(r.primary_category_id) === options.primaryCategoryId);
  }
  if (options.primaryServiceCategoryIds?.length) {
    filtered = filtered.filter((r) =>
      options.primaryServiceCategoryIds!.includes(String(r.service_category_id ?? "")),
    );
  } else if (options.explicitServiceCategoryId) {
    filtered = filtered.filter(
      (r) => String(r.service_category_id ?? "") === options.explicitServiceCategoryId,
    );
  }
  if (options.constrainVibeTags?.length) {
    filtered = filtered.filter((r) =>
      rowMatchesVibeTags(r.intent_tags as string[] | null, options.constrainVibeTags),
    );
  }
  return filtered;
}

// ---------------------------------------------------------------------------
// Payload builder from ranked rows
// ---------------------------------------------------------------------------

function buildPayloadFromRankedRows(
  options: MinimalSearchBuildOptions,
  rows: ScoredVecRow[],
  breakdowns: Map<unknown, ScoreBreakdown>,
  total: number,
  from: number,
  page: number,
  pageSize: number,
  retrieval: SearchRetrievalMetrics,
  intentCategory: string | null,
  hasLocation: boolean,
): SearchResultPayload {
  const recs = rows.map((row, i) => {
    const r = row as {
      main_image?: string | null;
      hero_image?: string | null;
      main_image_url?: string | null;
      hero_image_url?: string | null;
    };
    const img = getPublicImageUrlWithView(r.main_image_url, r.hero_image_url, r.main_image, r.hero_image);
    const bp = businessPayload(row, img);
    const breakdown = breakdowns.get(row.id) ?? undefined;
    return {
      business_id: String(row.id),
      rank: from + i + 1,
      headline: String((row as { title?: string }).title ?? "Listing"),
      explanation: (row.excerpt as string | null) ?? "",
      highlighted_tags: [],
      business: bp,
      score_breakdown: breakdown,
    };
  });

  const topComposite = recs[0]?.score_breakdown?.composite ?? 0;
  const avgDataQuality =
    rows.length > 0
      ? rows.reduce((s, r) => s + (typeof r.data_quality_score === "number" ? (r.data_quality_score as number) : 0.5), 0) / rows.length
      : 0.5;

  const confidence = computeSearchConfidence(
    retrieval,
    topComposite,
    total,
    avgDataQuality,
    Boolean(intentCategory),
    hasLocation,
  );

  return {
    query: options.rawQuery,
    query_hash: options.queryHash,
    normalized_query: options.normalizedQuery,
    summary: `Found ${total} local picks for "${options.rawQuery}".`,
    total_results: total,
    page,
    page_size: pageSize,
    recommendations: recs,
    suggestions: [],
    cached: false,
    confidence,
    _retrieval: retrieval,
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Simplified search over `businesses` without query_cache or legacy scoring.
 * Degradation ladder: hybrid_strict → hybrid_relaxed → ILIKE.
 * Returns score_breakdown and confidence always (not dev-only).
 */
export async function buildMinimalSearchResult(
  supabase: SupabaseClient,
  options: MinimalSearchBuildOptions,
): Promise<SearchResultPayload> {
  const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 12));
  const page = Math.max(1, options.page ?? 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const rankConfig = DEFAULT_SEARCH_RANK_CONFIG;

  const scoringIntent: ScoringIntent = {
    category:        options.intentCategory,
    specificItems:   options.intentSpecificItems,
    dietaryNeeds:    options.intentDietaryNeeds,
    mealPeriod:      options.intentMealPeriod,
    atmosphereNeeds: options.intentAtmosphereNeeds,
    occasion:        options.intentOccasion,
  };

  const hasLocation = !!(options.constrainTownId || options.nearTownIds?.length || options.constrainAreaId);
  const canUseVector =
    !!options.openaiKey && !options.constrainAreaId && options.pageBrowseWithoutQuery !== true;
  let hybridAttemptedPaths: SearchRetrievalPath[] = [];

  if (canUseVector) {
    const searchText = options.normalizedQuery;
    const minimalApparelKw = isMinimalApparelRetailKeywordQuery(searchText);
    const isApparelShoppingQuery =
      options.intentCategory === "shopping" && isApparelFashionRetailQuery(searchText);
    const embedding =
      options.precomputedQueryEmbedding !== undefined
        ? options.precomputedQueryEmbedding
        : await getSearchQueryEmbedding(searchText, options.openaiKey!);

    if (embedding) {
      const vectorCategoryId = options.explicitCategoryId ?? null;
      const rpcMatchCount =
        minimalApparelKw && vectorCategoryId && isApparelShoppingQuery
          ? Math.max(from + pageSize * 8, 100)
          : Math.max(from + pageSize * 6, 60);

      const rpcParams: Record<string, unknown> = {
        query_text: searchText,
        query_embedding: `[${embedding.join(",")}]`,
        match_count: rpcMatchCount,
        p_town_id: options.nearTownIds ? null : (options.constrainTownId ?? null),
        p_town_ids: options.nearTownIds ?? null,
        p_anchor_town_id: options.constrainTownId ?? null,
        p_category_id: vectorCategoryId,
        p_is_service_business:
          typeof options.requiredIsServiceBusiness === "boolean"
            ? options.requiredIsServiceBusiness
            : null,
        p_service_category_id: options.explicitServiceCategoryId ?? null,
      };

      // Pass user coordinates when available for geo-distance scoring
      if (options.userLat != null && options.userLng != null) {
        rpcParams.p_user_lat = options.userLat;
        rpcParams.p_user_lng = options.userLng;
      }

      const { data: rpcRows, error } = await supabase.rpc("hybrid_search_businesses", rpcParams);

      if (!error && rpcRows) {
        const allRows = rpcRows as Record<string, unknown>[];

        const ACCOMMODATION_TYPES = /hotel|inn|resort|event venue|venue|convention/i;
        const nonAccommodationRows = options.intentCategory === "accommodations"
          ? allRows
          : allRows.filter((r) => !ACCOMMODATION_TYPES.test(String(r.business_type ?? "")));

        const apparelScopedShopping =
          Boolean(vectorCategoryId) &&
          options.intentCategory === "shopping" &&
          isApparelFashionRetailQuery(searchText);
        const vecFloorForRows =
          apparelScopedShopping && minimalApparelKw
            ? Math.min(rankConfig.minVecFloor, rankConfig.vecFloorMinimalApparelScoped)
            : rankConfig.minVecFloor;
        const vecFloorFiltered = !vectorCategoryId || apparelScopedShopping
          ? nonAccommodationRows.filter((r) => ((r.vec_similarity as number) ?? 0) >= vecFloorForRows)
          : nonAccommodationRows;

        // Load CTR boosts before scoring
        const clusterKey = deriveQueryClusterKey({
          normalizedQuery: options.normalizedQuery,
          intentCategory: options.intentCategory ?? null,
          resolvedCategorySlugs: options.intentCategory ? [options.intentCategory] : [],
          townIds: options.nearTownIds ?? (options.constrainTownId ? [options.constrainTownId] : []),
        });
        const boostMap = await loadLearningBoostMap(supabase, clusterKey);

        // Score with full breakdown
        const breakdowns = new Map<unknown, ScoreBreakdown>();
        type ScoredRow = Record<string, unknown> & { _composite: number };
        const scored: ScoredRow[] = vecFloorFiltered.map((r) => {
          const vecSim = (r.vec_similarity as number) ?? 0;
          const learningBoost = boostMap.get(String(r.id)) ?? 0;
          const breakdown = computeCompositeWithBreakdown(r, scoringIntent, vecSim, learningBoost);
          breakdowns.set(r.id, breakdown);
          return { ...r, _composite: breakdown.composite };
        });
        scored.sort((a, b) => b._composite - a._composite);

        const postRankingBase: Omit<HybridVectorPostRankingInput, "relaxationTier"> = {
          scored,
          searchText,
          intentCategory: options.intentCategory ?? null,
          intentSpecificItems: options.intentSpecificItems,
          intentDietaryNeeds: options.intentDietaryNeeds,
          intentAtmosphereNeeds: options.intentAtmosphereNeeds,
          intentOccasion: options.intentOccasion ?? null,
          intentMealPeriod: options.intentMealPeriod ?? null,
          pageSize,
          vectorCategoryId,
          minimalApparelKw,
          isApparelShoppingQuery,
          titleRescueMinVec: rankConfig.minVecFloor,
        };

        hybridAttemptedPaths = ["hybrid_strict"];
        const metrics: SearchRetrievalMetrics = {
          path: "hybrid_strict",
          attempted_paths: hybridAttemptedPaths,
          rpc_row_count: allRows.length,
          after_accommodation_filter: nonAccommodationRows.length,
          after_vec_floor: scored.length,
        };

        let postRanked = applyHybridVectorPostRanking({ ...postRankingBase, relaxationTier: "strict" }, rankConfig);
        metrics.after_post_rank_strict = postRanked.length;

        let filtered = filterRowsBySidebar(postRanked, options);
        metrics.after_sidebar_filters = filtered.length;

        if (filtered.length === 0 && scored.length > 0) {
          hybridAttemptedPaths = [...hybridAttemptedPaths, "hybrid_relaxed"];
          metrics.attempted_paths = hybridAttemptedPaths;
          postRanked = applyHybridVectorPostRanking({ ...postRankingBase, relaxationTier: "relaxed" }, rankConfig);
          metrics.after_post_rank_relaxed = postRanked.length;
          filtered = filterRowsBySidebar(postRanked, options);
          metrics.after_sidebar_filters = filtered.length;
          if (filtered.length > 0) metrics.path = "hybrid_relaxed";
        }

        if (filtered.length > 0) {
          const rows = filtered.slice(from, from + pageSize);
          return buildPayloadFromRankedRows(
            options,
            rows,
            breakdowns,
            filtered.length,
            from,
            page,
            pageSize,
            metrics,
            options.intentCategory ?? null,
            hasLocation,
          );
        }
      }
      // Fall through to ILIKE on RPC error or empty
    }
  }

  // ---------------------------------------------------------------------------
  // ILIKE fallback
  // ---------------------------------------------------------------------------

  const ilikeOrClause = resolveIlikeOrClause({
    normalizedQuery: options.normalizedQuery,
    rawQuery: options.rawQuery,
    searchTermOverride: options.searchTermOverride,
    intentCategory: options.intentCategory,
    intentSpecificItems: options.intentSpecificItems,
    skipIlikeTextFilter: Boolean(options.skipIlikeTextFilter),
  });

  let query = supabase
    .from("businesses_view")
    .select(
      `id, town_id, slug, title, address, phone, website, content, excerpt, map_lat, map_lng, review_rating_cached, review_count_cached, price_level, main_image, hero_image, main_image_url, hero_image_url, status, featured, date_updated, business_categories ( title, slug ), towns ( title, slug )`,
      { count: "exact" },
    )
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)

  if (ilikeOrClause) query = query.or(ilikeOrClause);

  if (options.nearTownIds?.length) {
    query = query.in("town_id", options.nearTownIds);
  } else if (options.constrainTownId) {
    query = query.eq("town_id", options.constrainTownId);
  }

  if (options.constrainAreaId) {
    const { data: linkRows } = await supabase
      .from("area_businesses")
      .select("business_id")
      .eq("area_id", options.constrainAreaId);
    const linkIds = (linkRows ?? [])
      .map((r) => (r as { business_id: string }).business_id)
      .filter(Boolean)
      .slice(0, 500);
    if (linkIds.length > 0) {
      query = query.or(`area_id.eq.${options.constrainAreaId},id.in.(${linkIds.join(",")})`);
    } else {
      query = query.eq("area_id", options.constrainAreaId);
    }
  }

  if (options.primaryCategoryIds?.length) {
    query = query.in("primary_category_id", options.primaryCategoryIds);
  } else if (options.primaryCategoryId) {
    query = query.eq("primary_category_id", options.primaryCategoryId);
  }

  if (options.primaryServiceCategoryIds?.length) {
    query = query.in("service_category_id", options.primaryServiceCategoryIds);
  } else if (options.explicitServiceCategoryId) {
    query = query.eq("service_category_id", options.explicitServiceCategoryId);
  }

  if (options.requiredHasPhysicalLocation === true) {
    query = query.not("map_lat", "is", null).not("map_lng", "is", null);
  }

  if (typeof options.requiredIsServiceBusiness === "boolean") {
    query = query.eq("is_service_business", options.requiredIsServiceBusiness);
  }

  if (options.constrainPriceBucket) {
    if (options.constrainPriceBucket === "inexpensive") {
      query = query.in("price_level", ["1", "2"]);
    } else if (options.constrainPriceBucket === "moderate") {
      query = query.in("price_level", ["2", "3"]);
    } else {
      query = query.in("price_level", ["3", "4"]);
    }
  }

  if (options.sortMode === "updated") {
    query = query.order("date_updated", { ascending: false, nullsFirst: false });
  } else if (options.sortMode === "name") {
    query = query.order("title", { ascending: true });
  } else {
    query = query
      .order("featured", { ascending: false, nullsFirst: true })
      .order("review_rating_cached", { ascending: false, nullsFirst: true })
      .order("review_count_cached", { ascending: false, nullsFirst: true })
      .order("title", { ascending: true });
  }

  const { data: rows, error, count } = await query.range(from, to);
  if (error) console.error("buildMinimalSearchResult ILIKE", error);

  let list = (rows ?? []) as Record<string, unknown>[];
  if (options.constrainVibeTags?.length) {
    list = list.filter((row) =>
      rowMatchesVibeTags(row.intent_tags as string[] | null, options.constrainVibeTags),
    );
  }
  const recs = list.map((row, i) => rowToRec(row, from + i + 1));

  const ilikePath: SearchRetrievalPath = options.pageBrowseWithoutQuery ? "browse_no_text" : "ilike";
  const ilikeMetrics: SearchRetrievalMetrics = {
    path: ilikePath,
    attempted_paths: [...hybridAttemptedPaths, ilikePath],
    ilike_applied: Boolean(ilikeOrClause),
    after_sidebar_filters: count ?? recs.length,
  };

  const totalResults = count ?? recs.length;
  const confidence = computeSearchConfidence(
    ilikeMetrics,
    0,
    totalResults,
    0.5,
    Boolean(options.intentCategory),
    hasLocation,
  );

  return {
    query: options.rawQuery,
    query_hash: options.queryHash,
    normalized_query: options.normalizedQuery,
    summary: `Found ${totalResults} local picks for "${options.rawQuery}".`,
    total_results: totalResults,
    page,
    page_size: pageSize,
    recommendations: recs,
    suggestions: [],
    cached: false,
    confidence,
    _retrieval: ilikeMetrics,
  };
}
