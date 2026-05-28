import { hashQuery } from "@/lib/query-normalize";
import type { SearchIntent } from "@/lib/intent-schema";
import type { SearchCandidateRankOrder } from "@/lib/scoring";
import type { ResolvedFilters } from "@/lib/search/types";

export type SearchPriceBucket = "inexpensive" | "moderate" | "expensive";

const CACHE_VERSION = "search-v6-search-plan";

/** URL / sidebar constraints before any DB or intent merge. */
export type ExplicitSearchConstraints = {
  explicitTownIds: string[];
  explicitCategorySlugs: string[];
  constrainAreaId?: string;
  excludedCategorySlug?: string | null;
  requiredHasPhysicalLocation?: boolean;
  scopeOverride?: "in" | "near" | "anywhere";
  constrainPriceBucket: SearchPriceBucket | null;
  constrainVibeTags: string[];
  /** Page-level browse with no typed `q` — never run vector embed for this request. */
  pageBrowseWithoutQuery: boolean;
  sortMode?: SearchCandidateRankOrder;
  page: number;
  pageSize: number;
};

export type ResolvedCategoryFilter = {
  filterCategoryIds: string[];
  /** Set only when the user picked a single category in the URL (vector RPC scope). */
  explicitCategoryId: string | null;
  resolvedCategorySlugs: string[];
};

export type ResolvedTownFilter = {
  resolvedTownId: string | undefined;
  nearTownIds: string[] | undefined;
};

/** How ILIKE text retrieval should run for this request. */
export type TextSearchPlan = {
  skipIlikeTextFilter: boolean;
  searchTermOverride: string | undefined;
};

export type IntentScoringSignals = {
  intentCategory: string | null;
  intentSpecificItems?: string[];
  intentDietaryNeeds?: string[];
  intentMealPeriod: string | null;
  intentAtmosphereNeeds?: string[];
  intentOccasion: string | null;
};

/**
 * Fully resolved routing + retrieval inputs for one search request.
 * Produced by `assembleSearchPlan`; consumed by `executeSearchFromPlan`.
 */
export type SearchPlan = {
  rawQuery: string;
  normalizedQuery: string;
  queryHash: string;
  intent: SearchIntent;
  explicit: ExplicitSearchConstraints;
  category: ResolvedCategoryFilter;
  town: ResolvedTownFilter;
  text: TextSearchPlan;
  effectivePriceBucket: SearchPriceBucket | null;
  effectiveVibeTags: string[];
  scoring: IntentScoringSignals;
  prefetchVectorEmbedding: boolean;
  precomputedQueryEmbedding?: number[] | null;
  model: string;
  openaiKey: string | undefined;
  sessionId?: string | null;
  userId?: string | null;
};

export function priceLevelToBucket(level: number | null | undefined): SearchPriceBucket | null {
  if (!level) return null;
  if (level === 1) return "inexpensive";
  if (level === 4) return "expensive";
  return "moderate";
}

export function normalizeExplicitConstraints(options: {
  constrainTownIds?: string[];
  constrainTownId?: string;
  constrainCategorySlugs?: string[];
  constrainCategorySlug?: string | null;
  forcedCategorySlug?: string | null;
  constrainAreaId?: string;
  excludedCategorySlug?: string | null;
  requiredHasPhysicalLocation?: boolean;
  scopeOverride?: "in" | "near" | "anywhere";
  constrainPriceBucket?: SearchPriceBucket | null;
  constrainVibeTags?: string[];
  skipIlikeTextFilter?: boolean;
  sortMode?: SearchCandidateRankOrder;
  page?: number;
  pageSize?: number;
}): ExplicitSearchConstraints {
  const explicitTownIds = options.constrainTownIds?.length
    ? options.constrainTownIds
    : options.constrainTownId
      ? [options.constrainTownId]
      : [];

  const explicitCategorySlugs = options.constrainCategorySlugs?.length
    ? options.constrainCategorySlugs
    : options.constrainCategorySlug
      ? [options.constrainCategorySlug]
      : options.forcedCategorySlug
        ? [options.forcedCategorySlug]
        : [];

  return {
    explicitTownIds,
    explicitCategorySlugs,
    constrainAreaId: options.constrainAreaId,
    excludedCategorySlug: options.excludedCategorySlug,
    requiredHasPhysicalLocation: options.requiredHasPhysicalLocation,
    scopeOverride: options.scopeOverride,
    constrainPriceBucket: options.constrainPriceBucket ?? null,
    constrainVibeTags: options.constrainVibeTags ?? [],
    pageBrowseWithoutQuery: Boolean(options.skipIlikeTextFilter),
    sortMode: options.sortMode,
    page: Math.max(1, options.page ?? 1),
    pageSize: options.pageSize ?? 12,
  };
}

export function buildSearchQueryHash(
  normalizedQuery: string,
  explicit: ExplicitSearchConstraints,
): string {
  let cacheBasis = `${normalizedQuery}::__v__:${CACHE_VERSION}`;
  if (explicit.explicitTownIds.length) {
    cacheBasis += `::__towns__:${explicit.explicitTownIds.slice().sort().join(",")}`;
  }
  if (explicit.explicitCategorySlugs.length) {
    cacheBasis += `::__cats__:${explicit.explicitCategorySlugs.slice().sort().join(",")}`;
  }
  if (explicit.constrainAreaId) cacheBasis += `::__area__:${explicit.constrainAreaId}`;
  if (explicit.excludedCategorySlug) cacheBasis += `::__excl_cat__:${explicit.excludedCategorySlug}`;
  if (typeof explicit.requiredHasPhysicalLocation === "boolean") {
    cacheBasis += `::__physical__:${explicit.requiredHasPhysicalLocation ? "yes" : "no"}`;
  }
  if (explicit.sortMode && explicit.sortMode !== "relevance") {
    cacheBasis += `::__sort__:${explicit.sortMode}`;
  }
  if (explicit.pageBrowseWithoutQuery) cacheBasis += `::__browse__:no_ilike`;
  if (explicit.scopeOverride) cacheBasis += `::__scope__:${explicit.scopeOverride}`;
  if (explicit.constrainPriceBucket) cacheBasis += `::__price__:${explicit.constrainPriceBucket}`;
  if (explicit.page > 1) cacheBasis += `::__page__:${explicit.page}`;
  if (explicit.pageSize !== 12) cacheBasis += `::__page_size__:${explicit.pageSize}`;
  return hashQuery(cacheBasis);
}

export function intentSpecificItemsForSearch(intent: SearchIntent): string[] | undefined {
  const items = (intent.specific_items ?? []).map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

export function buildIntentScoringSignals(
  intent: SearchIntent,
  resolvedCategorySlugs: string[],
): IntentScoringSignals {
  return {
    intentCategory: resolvedCategorySlugs[0] ?? intent.category ?? null,
    intentSpecificItems: intentSpecificItemsForSearch(intent),
    intentDietaryNeeds: intent.dietary_needs?.length ? intent.dietary_needs : undefined,
    intentMealPeriod: intent.meal_period ?? null,
    intentAtmosphereNeeds: intent.atmosphere_needs?.length ? intent.atmosphere_needs : undefined,
    intentOccasion: intent.occasion ?? null,
  };
}

/**
 * Pure ILIKE routing from merged intent + resolved town/category (no DB).
 */
export function buildTextSearchPlan(input: {
  rawQuery: string;
  intent: SearchIntent;
  explicitTownIds: string[];
  resolvedTownId: string | undefined;
  filterCategoryIds: string[];
  pageBrowseWithoutQuery: boolean;
}): TextSearchPlan {
  const { rawQuery, intent, explicitTownIds, resolvedTownId, filterCategoryIds, pageBrowseWithoutQuery } =
    input;

  let skipIlikeTextFilter = pageBrowseWithoutQuery;
  let searchTermOverride: string | undefined;

  if (!skipIlikeTextFilter) {
    const singleExplicitTownId = explicitTownIds.length === 1 ? explicitTownIds[0] : undefined;
    const intentResolved = !!(resolvedTownId !== singleExplicitTownId || filterCategoryIds.length);

    if (intent.attributes.length > 0) {
      searchTermOverride = intent.attributes.join(" ");
    } else if (intentResolved) {
      const townResolved = !!(resolvedTownId && !singleExplicitTownId);
      const categoryResolved = filterCategoryIds.length > 0;

      if (townResolved && categoryResolved) {
        if (intent.subcategory) {
          const coreTerm = intent.subcategory
            .replace(/_/g, " ")
            .replace(/\b(store|shop|place|bar|cafe|restaurant|house)\b/gi, "")
            .replace(/\s+/g, " ")
            .trim();
          if (coreTerm) searchTermOverride = coreTerm;
          else skipIlikeTextFilter = true;
        } else {
          skipIlikeTextFilter = true;
        }
      } else {
        const noisePattern =
          /\b(near|in|at|by|for|around|the|a|an|and|of|with|some|any|good|best|great|top)\b/gi;
        const townName = intent.location?.town ?? "";
        const townDisplayName = townName.replace(/-/g, " ");
        const stripped = rawQuery
          .replace(
            new RegExp(`\\b${townDisplayName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"),
            "",
          )
          .replace(new RegExp(`\\b${townName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"), "")
          .replace(noisePattern, " ")
          .replace(/\s+/g, " ")
          .trim();
        if (!stripped) skipIlikeTextFilter = true;
        else searchTermOverride = stripped;
      }
    }
  }

  return { skipIlikeTextFilter, searchTermOverride };
}

export function resolvedFiltersFromPlan(plan: SearchPlan): ResolvedFilters {
  const { explicit, town, category, effectivePriceBucket, effectiveVibeTags } = plan;
  const activeTownIds =
    explicit.explicitTownIds.length > 1
      ? explicit.explicitTownIds
      : town.resolvedTownId
        ? [town.resolvedTownId]
        : [];

  return {
    town_ids: activeTownIds,
    category_slugs: category.resolvedCategorySlugs,
    vibe_tags: effectiveVibeTags,
    price_bucket: effectivePriceBucket,
  };
}
