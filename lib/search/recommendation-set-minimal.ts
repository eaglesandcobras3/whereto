import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicImageUrlWithView } from "@/lib/media/public-image-url";
import {
  applyHybridVectorPostRanking,
  DEFAULT_SEARCH_RANK_CONFIG,
  isApparelFashionRetailQuery,
  isMinimalApparelRetailKeywordQuery,
  itemMatchesTaggedRow,
  type HybridVectorPostRankingInput,
  type ScoredVecRow,
} from "@/lib/search/hybrid-vector-postprocess";
import { resolveIlikeOrClause } from "@/lib/search/ilike-text-search";
import { getSearchQueryEmbedding } from "@/lib/search/query-embedding";
import { loadLearningBoostMap } from "@/lib/search/learning-boost";
import { deriveQueryClusterKey } from "@/lib/search/query-cluster";
import {
  BROWSE_VISIBLE_NOT_HIDDEN,
  DIRECTUS_PUBLISHED_STATUS,
} from "@/lib/shop/public-listing-filters";
import type {
  BusinessPayload,
  SearchResultPayload,
  SearchRetrievalMetrics,
  SearchRetrievalPath,
} from "@/lib/search/types";
import type { SearchCandidateRankOrder } from "@/lib/scoring";

// ---------------------------------------------------------------------------
// Composite scoring
// ---------------------------------------------------------------------------
// Combines structured facet matching + semantic similarity + listing quality.
// When no structured intent fields are present (simple keyword query),
// composite collapses to: vecSim * 0.90 + quality * 0.10 — so semantic similarity
// does the heavy lifting. When intent has specific_items, dietary_needs, etc.,
// structured matching amplifies the right results and penalises the wrong ones.

type ScoringIntent = {
  category?: string | null;
  specificItems?: string[];
  dietaryNeeds?: string[];
  mealPeriod?: string | null;
  atmosphereNeeds?: string[];
  occasion?: string | null;
};

function computeStructuredMatch(row: Record<string, unknown>, intent: ScoringIntent): { score: number; hasSignal: boolean } {
  const components: { weight: number; score: number }[] = [];

  // When BI `business_type` is empty we have no corroborating text — omit this component rather
  // than scoring 0 against every row (category is often already enforced by SQL filters).
  if (intent.category) {
    const businessType = String(row.business_type ?? "").trim().toLowerCase();
    if (businessType) {
      const catNorm = intent.category.replace(/_/g, " ").toLowerCase();

      // Per-category regex maps category intent to the vocabulary used in business_type.
      // This prevents vocabulary mismatch (e.g. "café" not matching "coffee_shops") from
      // silently filtering out correct results in the composite scoring step.
      const CATEGORY_TYPE_PATTERNS: Record<string, RegExp> = {
        restaurants:
          /restaurant|coffee|cafe|café|diner|bistro|grill|eatery|food.?truck|food.?stand|taqueria|pizzeria|taco|hot.?dog|ice.?cream|dessert|bakery|donut|doughnut|smoothie|juice.?bar|kitchen|brasserie|steakhouse|seafood|sushi|bar$|pub$|bbq|barbecue|creperie|ramen|poke|sandwich/i,
        coffee_shops:
          /coffee|cafe|café|espresso|coffeehouse|coffee.?house|tea|latte|cappuccino|barista|roaster|brew/i,
        bars:
          /bar|pub|tavern|brewery|brewpub|winery|lounge|cocktail|nightclub|dive.?bar|sports.?bar|taproom/i,
        activities:
          /activit|rental|tour|fitness|gym|studio|sport|outdoor|water.?sport|bike|paddl|surf|yoga|pilates|marina|charter|excursion|kayak|snorkel|dive|golf|tennis|pickleball/i,
        shopping:
          /boutique|shop|store|retail|gallery|clothing|apparel|fashion|gift|jewelry|jewellery|market|souvenir|consignment|thrift/i,
        services:
          /salon|spa|wellness|beauty|medical|dental|repair|service|contractor|studio|therapy|massage|realtor|insurance|legal/i,
      };

      const catKey = intent.category.toLowerCase();
      const categoryPattern = CATEGORY_TYPE_PATTERNS[catKey];

      // Word-level fallback only when no pattern is defined — prevents stem "shop" from
      // "coffee_shops" matching unrelated business types like "surf shop" or "art shop".
      const wordMatch = !categoryPattern && catNorm.split(" ").some((w) => {
        if (w.length <= 3) return false;
        const stem = w.replace(/s$/, "");
        return businessType.includes(w) || businessType.includes(stem);
      });

      const matchScore = (categoryPattern ? categoryPattern.test(businessType) : wordMatch) ? 1.0 : 0.0;
      components.push({ weight: 40, score: matchScore });
    }
  }

  if (intent.specificItems?.length) {
    const rowItemsRaw = ((row.item_tags as string[] | null) ?? []).map((t) => String(t).trim());
    const rowItems = rowItemsRaw.map((t) => t.toLowerCase());
    const hasTypedMenu = rowItemsRaw.some((t) => t.length > 0);
    // No mined menu on this listing — do not treat "no tag match" as disproof; let vector sim carry.
    if (hasTypedMenu) {
      const matched = intent.specificItems.filter((item) => itemMatchesTaggedRow(item, rowItems)).length;
      components.push({ weight: 35, score: matched / intent.specificItems.length });
    }
  }

  if (intent.dietaryNeeds?.length) {
    const rowDietary = (row.dietary_tags as string[] | null) ?? [];
    const matched = intent.dietaryNeeds.filter((d) => rowDietary.includes(d)).length;
    components.push({ weight: 15, score: matched / intent.dietaryNeeds.length });
  }

  if (intent.mealPeriod) {
    const rowMeal = (row.meal_period_tags as string[] | null) ?? [];
    components.push({ weight: 5, score: rowMeal.includes(intent.mealPeriod) ? 1.0 : 0.0 });
  }

  if (intent.atmosphereNeeds?.length || intent.occasion) {
    const rowAtm = (row.atmosphere_tags as string[] | null) ?? [];
    const rowOcc = (row.occasion_tags as string[] | null) ?? [];
    const rowAll = [...rowAtm, ...rowOcc].map((t) => t.toLowerCase());
    const needed = [...(intent.atmosphereNeeds ?? []), ...(intent.occasion ? [intent.occasion] : [])];
    const matched = needed.filter((n) => rowAll.some((r) => r.includes(n.toLowerCase()))).length;
    components.push({ weight: 5, score: matched / needed.length });
  }

  if (components.length === 0) return { score: 0, hasSignal: false };
  const totalWeight = components.reduce((s, c) => s + c.weight, 0);
  const weightedScore = components.reduce((s, c) => s + c.weight * c.score, 0);
  return { score: weightedScore / totalWeight, hasSignal: true };
}

function computeQuality(row: Record<string, unknown>): number {
  const featured = (row.featured as boolean | null) ? 1.0 : 0.0;
  const rating = Math.min(1.0, ((row.review_rating_cached as number | null) ?? 0) / 5.0);
  const reviews = Math.min(1.0, ((row.review_count_cached as number | null) ?? 0) / 50);
  return featured * 0.5 + rating * 0.3 + reviews * 0.2;
}

function computeComposite(row: Record<string, unknown>, intent: ScoringIntent, vecSim: number): number {
  const quality = computeQuality(row);
  const { score: structuredScore, hasSignal } = computeStructuredMatch(row, intent);
  if (!hasSignal) {
    // No structured intent — let semantic similarity drive results
    return vecSim * 0.90 + quality * 0.10;
  }
  return structuredScore * 0.60 + vecSim * 0.30 + quality * 0.10;
}

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

function rowToRec(
  row: Record<string, unknown>,
  rank: number,
): SearchResultPayload["recommendations"][number] {
  const r = row as {
    main_image?: string | null;
    hero_image?: string | null;
    main_image_url?: string | null;
    hero_image_url?: string | null;
  };
  const img = getPublicImageUrlWithView(
    r.main_image_url,
    r.hero_image_url,
    r.main_image,
    r.hero_image,
  );
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
  constrainVibeTags?: string[];
  intentCategory?: string | null;
  intentSpecificItems?: string[];
  intentDietaryNeeds?: string[];
  intentMealPeriod?: string | null;
  intentAtmosphereNeeds?: string[];
  intentOccasion?: string | null;
};

function filterRowsBySidebar(
  rows: ScoredVecRow[],
  options: MinimalSearchBuildOptions,
): ScoredVecRow[] {
  let filtered = rows;
  if (typeof options.requiredIsServiceBusiness === "boolean") {
    filtered = filtered.filter(
      (r) => Boolean(r.is_service_business) === options.requiredIsServiceBusiness,
    );
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
    filtered = filtered.filter((r) =>
      options.primaryCategoryIds!.includes(String(r.primary_category_id)),
    );
  } else if (options.primaryCategoryId) {
    filtered = filtered.filter(
      (r) => String(r.primary_category_id) === options.primaryCategoryId,
    );
  }
  if (options.constrainVibeTags?.length) {
    filtered = filtered.filter((r) => {
      const tags = (r.intent_tags as string[] | null) ?? [];
      return options.constrainVibeTags!.every((t) => tags.includes(t));
    });
  }
  return filtered;
}

function attachRetrievalDiagnostics(
  payload: SearchResultPayload,
  metrics: SearchRetrievalMetrics,
): SearchResultPayload {
  if (process.env.NODE_ENV !== "development") return payload;
  return { ...payload, _retrieval: metrics };
}

function buildPayloadFromRankedRows(
  options: MinimalSearchBuildOptions,
  rows: ScoredVecRow[],
  total: number,
  from: number,
  page: number,
  pageSize: number,
  retrieval: SearchRetrievalMetrics,
): SearchResultPayload {
  const recs = rows.map((row, i) => {
    const r = row as {
      main_image?: string | null;
      hero_image?: string | null;
      main_image_url?: string | null;
      hero_image_url?: string | null;
    };
    const img = getPublicImageUrlWithView(
      r.main_image_url,
      r.hero_image_url,
      r.main_image,
      r.hero_image,
    );
    const bp = businessPayload(row, img);
    const rec: SearchResultPayload["recommendations"][number] = {
      business_id: String(row.id),
      rank: from + i + 1,
      headline: String((row as { title?: string }).title ?? "Listing"),
      explanation: (row.excerpt as string | null) ?? "",
      highlighted_tags: [],
      business: bp,
    };
    if (process.env.NODE_ENV === "development") {
      rec._vec_similarity = (row.vec_similarity as number | null) ?? undefined;
      rec._composite = row._composite ?? undefined;
    }
    return rec;
  });

  return attachRetrievalDiagnostics(
    {
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
    },
    retrieval,
  );
}

/**
 * Simplified search over `businesses` (Directus-synced) without query_cache, scoring, or old joins.
 * Degradation ladder: hybrid_strict → hybrid_relaxed → ILIKE (`SearchRetrievalMetrics` in dev).
 */
export async function buildMinimalSearchResult(
  supabase: SupabaseClient,
  options: {
    rawQuery: string;
    normalizedQuery: string;
    queryHash: string;
    model: string;
    openaiKey: string | undefined;
    /** When set (including `null`), skip the embed API call — caller prefetched in parallel with intent. */
    precomputedQueryEmbedding?: number[] | null;
    page?: number;
    pageSize?: number;
    constrainTownId?: string;
    /** Multiple town IDs for "near <town>" queries — anchor + adjacent towns. */
    nearTownIds?: string[];
    /** `areas.id`: `businesses.area_id` or `area_businesses` for this area. */
    constrainAreaId?: string;
    requiredHasPhysicalLocation?: boolean;
    requiredIsServiceBusiness?: boolean;
    sortMode?: SearchCandidateRankOrder;
    /** When set, filter `businesses.primary_category_id`. */
    primaryCategoryId?: string | null;
    /**
     * Category the user explicitly selected via URL (dropdown). Used in vector search instead
     * of `primaryCategoryId` so AI-inferred categories don't over-constrain results.
     */
    explicitCategoryId?: string | null;
    /**
     * True only when `/search` loads a browse mode with **no typed `q`** (`skipIlikeTextFilter`
     * from the page route). Omit embeddings — directory browse stays a cheap listing.
     *
     * **Not** coupled to `skipIlikeTextFilter` after intent merge: NL queries ("books near Rosemary")
     * still set omit-ILIKE internally but MUST run vector search — otherwise there is zero text signal.
     */
    pageBrowseWithoutQuery?: boolean;
    /**
     * `?type=businesses` (or services) with no `q` used to pass a long placeholder string as one
     * ilike pattern — it matched nothing. When true, list visible non-archived rows without a text match.
     */
    skipIlikeTextFilter?: boolean;
    /**
     * Focused search term derived from intent attributes or a de-noised query, replacing
     * the raw query for the ilike so NL phrases like "restaurants near Seaside" don't get
     * matched verbatim against listing text.
     */
    searchTermOverride?: string;
    /** Natural-language price bucket. "inexpensive"=1, "moderate"=2-3, "expensive"=4. */
    constrainPriceBucket?: "inexpensive" | "moderate" | "expensive" | null;
    /** Filter to multiple explicit category IDs (OR logic). */
    primaryCategoryIds?: string[];
    /** Intent tag slugs to filter by (AND logic — business must have all selected). */
    constrainVibeTags?: string[];
    // --- Composite scoring signals (from AI intent) ---
    /** AI-detected category slug — used to score business_type alignment. */
    intentCategory?: string | null;
    /** Specific items/dishes/services mentioned in the query ("fish tacos", "cold brew"). */
    intentSpecificItems?: string[];
    /** Dietary restrictions mentioned ("gluten_free", "vegan"). */
    intentDietaryNeeds?: string[];
    /** Meal period detected ("breakfast", "dinner", etc.). */
    intentMealPeriod?: string | null;
    /** Atmosphere descriptors detected ("romantic", "waterfront"). */
    intentAtmosphereNeeds?: string[];
    /** Occasion detected ("date_night", "rainy_day", etc.). */
    intentOccasion?: string | null;
  },
): Promise<SearchResultPayload> {
  const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 12));
  const page = Math.max(1, options.page ?? 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // --- Vector search path ---
  // Use embeddings when OpenAI key is available and browse is **not** a page-level empty-query
  // directory listing. `getSearchQueryEmbedding` no-ops when `SEARCH_QUERY_EMBEDDINGS=false`.

  // Scoring strategy: composite score = structuredMatch * 0.60 + vecSim * 0.30 + quality * 0.10
  //   when structured intent fields (specific_items, dietary_needs, etc.) are present.
  // For simple keyword queries with no structured intent: vecSim * 0.90 + quality * 0.10.
  //
  // Post-RPC composite / salvage / gates: thresholds in `DEFAULT_SEARCH_RANK_CONFIG`
  // (`lib/search/hybrid-vector-postprocess.ts`).
  const rankConfig = DEFAULT_SEARCH_RANK_CONFIG;

  const scoringIntent: ScoringIntent = {
    category:        options.intentCategory,
    specificItems:   options.intentSpecificItems,
    dietaryNeeds:    options.intentDietaryNeeds,
    mealPeriod:      options.intentMealPeriod,
    atmosphereNeeds: options.intentAtmosphereNeeds,
    occasion:        options.intentOccasion,
  };

  const canUseVector =
    !!options.openaiKey && !options.constrainAreaId && options.pageBrowseWithoutQuery !== true;
  let hybridAttemptedPaths: SearchRetrievalPath[] = [];

  if (canUseVector) {
    // Always embed the full user query — searchTermOverride is an ILIKE optimisation only.
    const searchText = options.normalizedQuery;
    const minimalApparelKw = isMinimalApparelRetailKeywordQuery(searchText);
    const isApparelShoppingQuery =
      options.intentCategory === "shopping" && isApparelFashionRetailQuery(searchText);
    const embedding =
      options.precomputedQueryEmbedding !== undefined
        ? options.precomputedQueryEmbedding
        : await getSearchQueryEmbedding(searchText, options.openaiKey!);
    if (embedding) {
      // Only restrict the RPC to a specific category when the user explicitly selected one via the
      // URL sidebar. AI-inferred categories must NOT pre-filter p_category_id — that would exclude
      // cross-category businesses that sell the requested item (e.g. a coffee shop selling donuts
      // being excluded from a "donuts" restaurant-intent query). Composite scoring handles ranking.
      const vectorCategoryId = options.explicitCategoryId ?? null;
      // Larger candidate pool lets composite scoring consider more semantically-adjacent
      // businesses before applying the threshold — important when category matching is tight
      // (e.g. querying "coffee shops" but some cafés are ranked 50-80 by raw cosine distance).
      const rpcMatchCount =
        minimalApparelKw && vectorCategoryId && isApparelShoppingQuery
          ? Math.max(from + pageSize * 8, 100)
          : Math.max(from + pageSize * 6, 60);
      const { data: rpcRows, error } = await supabase.rpc("hybrid_search_businesses", {
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
      });
      if (!error && rpcRows) {
        const allRows = rpcRows as Record<string, unknown>[];

        // 0. Filter out accommodation / venue types — hotels, inns, event venues surface due to
        //    location-token overlap ("Rosemary Beach Inn" matches "coffee in Rosemary Beach") but
        //    are almost never the intended result for food/shopping/activity searches.
        const ACCOMMODATION_TYPES = /hotel|inn|resort|event venue|venue|convention/i;
        const nonAccommodationRows = options.intentCategory === "accommodations"
          ? allRows
          : allRows.filter((r) => !ACCOMMODATION_TYPES.test(String(r.business_type ?? "")));

        // 1. Vector similarity floor: always when uncategorized RPC; also when shopping scope +
        //    apparel/fashion query so weak gift-shop neighbors do not flood the list.
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

        // 2. Compute composite score and attach it; re-sort by composite DESC
        type ScoredRow = Record<string, unknown> & { _composite: number };
        const scored: ScoredRow[] = vecFloorFiltered.map((r) => ({
          ...r,
          _composite: computeComposite(r, scoringIntent, (r.vec_similarity as number) ?? 0),
        }));
        scored.sort((a, b) => b._composite - a._composite);

        // 3. Apply per-cluster CTR learning boost (additive, capped, threshold-gated)
        const clusterKey = deriveQueryClusterKey({
          normalizedQuery: options.normalizedQuery,
          intentCategory: options.intentCategory ?? null,
          resolvedCategorySlugs: options.intentCategory ? [options.intentCategory] : [],
          townIds: options.nearTownIds ?? (options.constrainTownId ? [options.constrainTownId] : []),
        });
        const boostMap = await loadLearningBoostMap(supabase, clusterKey);
        if (boostMap.size > 0) {
          for (const row of scored) {
            const boost = boostMap.get(String(row.id));
            if (boost) row._composite = Math.min(1, row._composite + boost);
          }
          scored.sort((a, b) => b._composite - a._composite);
        }

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

        let postRanked = applyHybridVectorPostRanking(
          { ...postRankingBase, relaxationTier: "strict" },
          rankConfig,
        );
        metrics.after_post_rank_strict = postRanked.length;

        let filtered = filterRowsBySidebar(postRanked, options);
        metrics.after_sidebar_filters = filtered.length;

        if (filtered.length === 0 && scored.length > 0) {
          hybridAttemptedPaths = [...hybridAttemptedPaths, "hybrid_relaxed"];
          metrics.attempted_paths = hybridAttemptedPaths;
          postRanked = applyHybridVectorPostRanking(
            { ...postRankingBase, relaxationTier: "relaxed" },
            rankConfig,
          );
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
            filtered.length,
            from,
            page,
            pageSize,
            metrics,
          );
        }
      }
      // Fall through to ILIKE on RPC error
    }
  }

  // --- ILIKE fallback path ---
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
    .or(BROWSE_VISIBLE_NOT_HIDDEN);

  if (ilikeOrClause) {
    query = query.or(ilikeOrClause);
  }

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

  if (options.constrainVibeTags?.length) {
    // Postgres array containment: business must have all selected tags (@> operator)
    query = query.contains("intent_tags", options.constrainVibeTags);
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

  if (error) {
    console.error("buildMinimalSearchResult", error);
  }

  const list = (rows ?? []) as Record<string, unknown>[];
  const recs = list.map((row, i) => rowToRec(row, from + i + 1));

  const ilikePath: SearchRetrievalPath = options.pageBrowseWithoutQuery
    ? "browse_no_text"
    : "ilike";

  return attachRetrievalDiagnostics(
    {
      query: options.rawQuery,
      query_hash: options.queryHash,
      normalized_query: options.normalizedQuery,
      summary: `Found ${count ?? recs.length} local picks for "${options.rawQuery}".`,
      total_results: count ?? recs.length,
      page,
      page_size: pageSize,
      recommendations: recs,
      suggestions: [],
      cached: false,
    },
    {
      path: ilikePath,
      attempted_paths: [...hybridAttemptedPaths, ilikePath],
      ilike_applied: Boolean(ilikeOrClause),
      after_sidebar_filters: count ?? recs.length,
    },
  );
}
