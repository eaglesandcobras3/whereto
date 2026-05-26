import { getServiceSupabase } from "@/lib/supabase/service-role";
import { hashQuery, normalizeQuery } from "@/lib/query-normalize";
import { searchIntentSchema } from "@/lib/intent-schema";
import { resolveIntent } from "@/lib/search/recommendation-set";
import { buildMinimalSearchResult } from "@/lib/search/recommendation-set-minimal";
import { loadTownScope } from "@/lib/search/location-scope";
import { inferRestaurantsSlugWhenSpecificItemsNeedCategory } from "@/lib/search/query-specific-hints";
import type { SearchCandidateRankOrder } from "@/lib/scoring";
import type { SearchResultPayload } from "@/lib/search/types";

export type { SearchResultPayload } from "@/lib/search/types";

type PriceBucket = "inexpensive" | "moderate" | "expensive";

function priceLevelToBucket(level: number | null | undefined): PriceBucket | null {
  if (!level) return null;
  if (level === 1) return "inexpensive";
  if (level === 4) return "expensive";
  return "moderate";
}

/**
 * Text search over Directus-backed `businesses` (no `query_cache` / legacy scoring).
 */
export async function runSearch(options: {
  rawQuery: string;
  userId: string | null;
  model: string;
  openaiKey: string | undefined;
  page?: number;
  pageSize?: number;
  forcedCategorySlug?: string | null;
  excludedCategorySlug?: string | null;
  requiredHasPhysicalLocation?: boolean;
  /** Single `towns.id` from URL — use constrainTownIds for multi-select. */
  constrainTownId?: string;
  /** Multiple explicit town IDs from sidebar multi-select (OR logic). */
  constrainTownIds?: string[];
  /** `areas.id` (UUID): businesses in this area via `area_id` or `area_businesses`. */
  constrainAreaId?: string;
  /** Single category slug override (backward compat). Use constrainCategorySlugs for multi. */
  constrainCategorySlug?: string | null;
  /** Multiple category slugs from sidebar multi-select (OR logic). */
  constrainCategorySlugs?: string[];
  sortMode?: SearchCandidateRankOrder;
  /** `?type=businesses` / `services` with no `q`: list all visible listings without ilike. */
  skipIlikeTextFilter?: boolean;
  /** Overrides AI-detected radius. Only applies when a single constrainTownId is set. */
  scopeOverride?: "in" | "near" | "anywhere";
  /** Explicit price bucket from sidebar. When absent, falls back to AI-detected price_level. */
  constrainPriceBucket?: PriceBucket | null;
  /** Intent tag slugs from sidebar (AND logic — business must have all). */
  constrainVibeTags?: string[];
}): Promise<SearchResultPayload> {
  const supabase = getServiceSupabase();
  const normalized = normalizeQuery(options.rawQuery);
  const CACHE_VERSION = "search-v5-resolved-filters";

  // Normalise multi-town input
  const explicitTownIds = options.constrainTownIds?.length
    ? options.constrainTownIds
    : options.constrainTownId
      ? [options.constrainTownId]
      : [];

  // Normalise multi-category input
  const explicitCategorySlugs = options.constrainCategorySlugs?.length
    ? options.constrainCategorySlugs
    : options.constrainCategorySlug
      ? [options.constrainCategorySlug]
      : options.forcedCategorySlug
        ? [options.forcedCategorySlug]
        : [];

  let cacheBasis = `${normalized}::__v__:${CACHE_VERSION}`;
  if (explicitTownIds.length) cacheBasis += `::__towns__:${explicitTownIds.sort().join(",")}`;
  if (explicitCategorySlugs.length) cacheBasis += `::__cats__:${explicitCategorySlugs.sort().join(",")}`;
  if (options.constrainAreaId) cacheBasis += `::__area__:${options.constrainAreaId}`;
  if (options.excludedCategorySlug) cacheBasis += `::__excl_cat__:${options.excludedCategorySlug}`;
  if (typeof options.requiredHasPhysicalLocation === "boolean") {
    cacheBasis += `::__physical__:${options.requiredHasPhysicalLocation ? "yes" : "no"}`;
  }
  if (options.sortMode && options.sortMode !== "relevance") cacheBasis += `::__sort__:${options.sortMode}`;
  if (options.skipIlikeTextFilter) cacheBasis += `::__browse__:no_ilike`;
  if (options.scopeOverride) cacheBasis += `::__scope__:${options.scopeOverride}`;
  if (options.constrainPriceBucket) cacheBasis += `::__price__:${options.constrainPriceBucket}`;
  if ((options.page ?? 1) > 1) cacheBasis += `::__page__:${options.page}`;
  if (options.pageSize && options.pageSize !== 12) cacheBasis += `::__page_size__:${options.pageSize}`;
  const queryHash = hashQuery(cacheBasis);

  let intent = await resolveIntent(
    options.rawQuery,
    normalized,
    options.model,
    options.openaiKey,
  );
  if (intent.result_count < 10) {
    intent = searchIntentSchema.parse({ ...intent, result_count: 10 });
  }

  const specificItemsForSearch = (() => {
    const t = (intent.specific_items ?? []).map((s) => s.trim()).filter(Boolean);
    return t.length ? t : undefined;
  })();

  const inferredRestaurantSlug =
    !explicitCategorySlugs.length && !options.skipIlikeTextFilter
      ? inferRestaurantsSlugWhenSpecificItemsNeedCategory(intent)
      : null;

  // --- Category resolution ---
  // Explicit slugs from URL override AI intent.
  let filterCategoryIds: string[] = []; // used for DB filter
  let explicitCategoryId: string | null = null; // used for vector search (single, only when explicit)
  let resolvedCategorySlugs: string[] = []; // for resolved_filters

  if (explicitCategorySlugs.length) {
    const { data: cats } = await supabase
      .from("business_categories")
      .select("id, slug")
      .in("slug", explicitCategorySlugs);
    filterCategoryIds = (cats ?? []).map((c) => (c as { id: string }).id);
    resolvedCategorySlugs = explicitCategorySlugs;
    if (filterCategoryIds.length === 1) explicitCategoryId = filterCategoryIds[0];
  } else if (!options.skipIlikeTextFilter) {
    const slugToResolve = intent.category ?? inferredRestaurantSlug;
    if (slugToResolve) {
      const { data: cat } = await supabase
        .from("business_categories")
        .select("id, slug")
        .eq("slug", slugToResolve)
        .maybeSingle();
      if (cat?.id) {
        filterCategoryIds = [cat.id as string];
        resolvedCategorySlugs = [String((cat as { slug?: string }).slug ?? slugToResolve)];
      }
    }
  }

  // --- Town resolution ---
  // explicitTownIds (from URL) take priority over AI-detected town.
  let resolvedTownId: string | undefined;
  let nearTownIds: string[] | undefined;

  if (explicitTownIds.length > 1) {
    // Multi-town explicit selection: use all towns as a set (no anchor boost)
    nearTownIds = explicitTownIds;
  } else if (explicitTownIds.length === 1) {
    resolvedTownId = explicitTownIds[0];
    // Apply scope override for single explicit town
    if (options.scopeOverride) {
      if (options.scopeOverride === "near") {
        const scope = await loadTownScope(supabase, resolvedTownId);
        nearTownIds = [resolvedTownId, ...scope.adjacentTownIds];
      } else if (options.scopeOverride === "anywhere") {
        resolvedTownId = undefined;
      }
      // "in": keep resolvedTownId, no nearTownIds
    }
  } else if (!options.skipIlikeTextFilter && intent.location?.town) {
    // AI-detected town
    const townName = intent.location.town;
    const townSlug = townName.toLowerCase().replace(/\s+/g, "-");
    const { data: townRow } = await supabase
      .from("towns")
      .select("id")
      .or(`slug.eq.${townSlug},title.ilike.${townName}`)
      .maybeSingle();
    if (townRow?.id) {
      resolvedTownId = String(townRow.id);
      if (intent.location.radius === "near") {
        const scope = await loadTownScope(supabase, resolvedTownId);
        nearTownIds = [resolvedTownId, ...scope.adjacentTownIds];
      }
    }
  }

  // --- Price resolution ---
  // Explicit bucket from URL overrides AI intent.
  const effectivePriceBucket: PriceBucket | null =
    options.constrainPriceBucket ?? priceLevelToBucket(intent.price_level);

  // --- ilike term building ---
  const singleExplicitTownId = explicitTownIds.length === 1 ? explicitTownIds[0] : undefined;
  let searchTermOverride: string | undefined;
  let skipIlike = options.skipIlikeTextFilter;
  if (!skipIlike) {
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
          else skipIlike = true;
        } else {
          skipIlike = true;
        }
      } else {
        const noisePattern = /\b(near|in|at|by|for|around|the|a|an|and|of|with|some|any|good|best|great|top)\b/gi;
        const townName = intent.location?.town ?? "";
        const townDisplayName = townName.replace(/-/g, " ");
        const stripped = options.rawQuery
          .replace(new RegExp(`\\b${townDisplayName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"), "")
          .replace(new RegExp(`\\b${townName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"), "")
          .replace(noisePattern, " ")
          .replace(/\s+/g, " ")
          .trim();
        if (!stripped) skipIlike = true;
        else searchTermOverride = stripped;
      }
    }
  }

  // --- Vibe tags ---
  // Explicit tags from URL take priority. Fall back to AI-detected attributes.
  const effectiveVibeTags: string[] = options.constrainVibeTags?.length
    ? options.constrainVibeTags
    : intent.attributes.length
      ? intent.attributes
      : [];

  const result = await buildMinimalSearchResult(supabase, {
    rawQuery: options.rawQuery,
    normalizedQuery: normalized,
    queryHash,
    model: options.model,
    openaiKey: options.openaiKey,
    page: options.page,
    pageSize: options.pageSize,
    constrainTownId: nearTownIds ? undefined : resolvedTownId,
    nearTownIds,
    constrainAreaId: options.constrainAreaId,
    requiredHasPhysicalLocation: options.requiredHasPhysicalLocation,
    sortMode: options.sortMode,
    primaryCategoryId: filterCategoryIds.length === 1 ? filterCategoryIds[0] : null,
    primaryCategoryIds: filterCategoryIds.length > 1 ? filterCategoryIds : undefined,
    explicitCategoryId,
    pageBrowseWithoutQuery: Boolean(options.skipIlikeTextFilter),
    skipIlikeTextFilter: skipIlike,
    searchTermOverride,
    constrainPriceBucket: effectivePriceBucket ?? undefined,
    constrainVibeTags: effectiveVibeTags.length ? effectiveVibeTags : undefined,
    // Composite scoring — prefer resolved sidebar/DB category when parser left null but we inferred food.
    intentCategory: resolvedCategorySlugs[0] ?? intent.category ?? null,
    intentSpecificItems: specificItemsForSearch,
    intentDietaryNeeds: intent.dietary_needs?.length ? intent.dietary_needs : undefined,
    intentMealPeriod: intent.meal_period ?? null,
    intentAtmosphereNeeds: intent.atmosphere_needs?.length ? intent.atmosphere_needs : undefined,
    intentOccasion: intent.occasion ?? null,
  });

  // Always populate resolved_filters so the sidebar can reflect AI detections.
  const activeTownIds = explicitTownIds.length > 1
    ? explicitTownIds
    : resolvedTownId
      ? [resolvedTownId]
      : [];
  result.resolved_filters = {
    town_ids: activeTownIds,
    category_slugs: resolvedCategorySlugs,
    vibe_tags: effectiveVibeTags,
    price_bucket: effectivePriceBucket,
  };

  if (process.env.NODE_ENV === "development") {
    result._debug = {
      intent,
      pageBrowseWithoutQuery: Boolean(options.skipIlikeTextFilter),
      filterCategoryId: filterCategoryIds[0] ?? null,
      resolvedTownId,
      nearTownIds,
      searchTermOverride,
      skipIlike: skipIlike ?? false,
    };
  }
  return result;
}
