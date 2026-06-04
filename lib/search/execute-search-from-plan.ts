import type { SupabaseClient } from "@supabase/supabase-js";
import { buildMinimalSearchResult } from "@/lib/search/recommendation-set-minimal";
import { resolvedFiltersFromPlan, type SearchPlan } from "@/lib/search/search-plan";
import { logSearchImpression } from "@/lib/search/log-search-impression";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import type { SearchResultPayload } from "@/lib/search/types";

/** Run hybrid/ILIKE retrieval using a fully assembled {@link SearchPlan}. */
export async function executeSearchFromPlan(
  supabase: SupabaseClient,
  plan: SearchPlan,
  /** When true, always populate _debug (for admin debugger). */
  includeDebug = false,
): Promise<SearchResultPayload> {
  const { category, serviceCategory, town, text, explicit, scoring } = plan;

  const result = await buildMinimalSearchResult(supabase, {
    rawQuery: plan.rawQuery,
    normalizedQuery: plan.normalizedQuery,
    queryHash: plan.queryHash,
    model: plan.model,
    openaiKey: plan.openaiKey,
    ...(plan.prefetchVectorEmbedding ? { precomputedQueryEmbedding: plan.precomputedQueryEmbedding } : {}),
    page: explicit.page,
    pageSize: explicit.pageSize,
    constrainTownId: town.nearTownIds ? undefined : town.resolvedTownId,
    nearTownIds: town.nearTownIds,
    constrainAreaId: explicit.constrainAreaId,
    requiredHasPhysicalLocation: explicit.requiredHasPhysicalLocation,
    requiredIsServiceBusiness: explicit.requiredIsServiceBusiness,
    sortMode: explicit.sortMode,
    primaryCategoryId: category.explicitCategoryId,
    primaryCategoryIds:
      explicit.explicitCategorySlugs.length > 1 ? category.filterCategoryIds : undefined,
    explicitCategoryId: category.explicitCategoryId,
    explicitServiceCategoryId: serviceCategory.explicitServiceCategoryId,
    primaryServiceCategoryIds:
      explicit.explicitServiceCategorySlugs.length > 1
        ? serviceCategory.filterServiceCategoryIds
        : undefined,
    pageBrowseWithoutQuery: explicit.pageBrowseWithoutQuery,
    skipIlikeTextFilter: text.skipIlikeTextFilter,
    searchTermOverride: text.searchTermOverride,
    constrainPriceBucket: plan.effectivePriceBucket ?? undefined,
    constrainVibeTags: plan.effectiveVibeTags.length ? plan.effectiveVibeTags : undefined,
    intentCategory: scoring.intentCategory,
    intentSpecificItems: scoring.intentSpecificItems,
    intentDietaryNeeds: scoring.intentDietaryNeeds,
    intentMealPeriod: scoring.intentMealPeriod,
    intentAtmosphereNeeds: scoring.intentAtmosphereNeeds,
    intentOccasion: scoring.intentOccasion,
    userLat: plan.userLat,
    userLng: plan.userLng,
  });

  result.resolved_filters = resolvedFiltersFromPlan(plan);

  const logged = await logSearchImpression(
    getServiceSupabase(),
    plan,
    result,
    result._retrieval,
    { sessionId: plan.sessionId, userId: plan.userId },
  );
  if (logged) result.impression_id = logged.impressionId;

  if (process.env.NODE_ENV === "development" || includeDebug) {
    result._debug = {
      intent: plan.intent,
      pageBrowseWithoutQuery: explicit.pageBrowseWithoutQuery,
      filterCategoryId: category.filterCategoryIds[0] ?? null,
      filterSpecialtyCategoryId: serviceCategory.filterServiceCategoryIds[0] ?? null,
      resolvedTownId: town.resolvedTownId,
      nearTownIds: town.nearTownIds,
      searchTermOverride: text.searchTermOverride,
      skipIlike: text.skipIlikeTextFilter,
      retrieval: result._retrieval,
    };
  }

  return result;
}
