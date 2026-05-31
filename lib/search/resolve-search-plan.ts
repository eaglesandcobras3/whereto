import type { SupabaseClient } from "@supabase/supabase-js";
import type { SearchIntent } from "@/lib/intent-schema";
import { normalizeBusinessCategorySlug } from "@/lib/search/category-slugs";
import { loadTownScope } from "@/lib/search/location-scope";
import { inferRestaurantsSlugWhenSpecificItemsNeedCategory } from "@/lib/search/query-specific-hints";
import {
  buildIntentScoringSignals,
  buildTextSearchPlan,
  priceLevelToBucket,
  type ExplicitSearchConstraints,
  type ResolvedCategoryFilter,
  type ResolvedTownFilter,
  type SearchPlan,
} from "@/lib/search/search-plan";

export async function resolveCategoryFilter(
  supabase: SupabaseClient,
  explicit: ExplicitSearchConstraints,
  intent: SearchIntent,
  inferredRestaurantSlug: string | null,
): Promise<ResolvedCategoryFilter> {
  let filterCategoryIds: string[] = [];
  let explicitCategoryId: string | null = null;
  let resolvedCategorySlugs: string[] = [];

  if (explicit.explicitCategorySlugs.length) {
    const normalizedSlugs = [
      ...new Set(
        explicit.explicitCategorySlugs
          .map((s) => normalizeBusinessCategorySlug(s))
          .filter((s): s is string => Boolean(s)),
      ),
    ];
    if (normalizedSlugs.length) {
      const { data: cats } = await supabase
        .from("business_categories")
        .select("id, slug")
        .in("slug", normalizedSlugs);
      filterCategoryIds = (cats ?? []).map((c) => (c as { id: string }).id);
      resolvedCategorySlugs = (cats ?? []).map((c) => String((c as { slug?: string }).slug));
      if (filterCategoryIds.length === 1) explicitCategoryId = filterCategoryIds[0];
    }
  }

  if (!filterCategoryIds.length && !explicit.pageBrowseWithoutQuery) {
    const slugToResolve = normalizeBusinessCategorySlug(
      intent.category ?? inferredRestaurantSlug,
    );
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

  return { filterCategoryIds, explicitCategoryId, resolvedCategorySlugs };
}

export async function resolveTownFilter(
  supabase: SupabaseClient,
  explicit: ExplicitSearchConstraints,
  intent: SearchIntent,
): Promise<ResolvedTownFilter> {
  let resolvedTownId: string | undefined;
  let nearTownIds: string[] | undefined;

  if (explicit.explicitTownIds.length > 1) {
    nearTownIds = explicit.explicitTownIds;
  } else if (explicit.explicitTownIds.length === 1) {
    resolvedTownId = explicit.explicitTownIds[0];
    if (explicit.scopeOverride) {
      if (explicit.scopeOverride === "near") {
        const scope = await loadTownScope(supabase, resolvedTownId);
        nearTownIds = [resolvedTownId, ...scope.adjacentTownIds];
      } else if (explicit.scopeOverride === "anywhere") {
        resolvedTownId = undefined;
      }
    }
  } else if (!explicit.pageBrowseWithoutQuery && intent.location?.town) {
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

  return { resolvedTownId, nearTownIds };
}

/** Merge URL constraints, intent, and DB lookups into a single {@link SearchPlan}. */
export async function assembleSearchPlan(
  supabase: SupabaseClient,
  input: {
    rawQuery: string;
    normalizedQuery: string;
    queryHash: string;
    intent: SearchIntent;
    explicit: ExplicitSearchConstraints;
    prefetchVectorEmbedding: boolean;
    precomputedQueryEmbedding?: number[] | null;
    model: string;
    openaiKey: string | undefined;
    sessionId?: string | null;
    userId?: string | null;
    userLat?: number | null;
    userLng?: number | null;
  },
): Promise<SearchPlan> {
  const { rawQuery, normalizedQuery, queryHash, intent, explicit, prefetchVectorEmbedding } =
    input;

  const inferredRestaurantSlug =
    !explicit.explicitCategorySlugs.length && !explicit.pageBrowseWithoutQuery
      ? inferRestaurantsSlugWhenSpecificItemsNeedCategory(intent)
      : null;

  const category = await resolveCategoryFilter(
    supabase,
    explicit,
    intent,
    inferredRestaurantSlug,
  );
  const town = await resolveTownFilter(supabase, explicit, intent);

  const text = buildTextSearchPlan({
    rawQuery,
    intent,
    explicitTownIds: explicit.explicitTownIds,
    resolvedTownId: town.resolvedTownId,
    filterCategoryIds: category.filterCategoryIds,
    pageBrowseWithoutQuery: explicit.pageBrowseWithoutQuery,
  });

  const effectivePriceBucket =
    explicit.constrainPriceBucket ?? priceLevelToBucket(intent.price_level);

  const effectiveVibeTags = explicit.constrainVibeTags.length
    ? explicit.constrainVibeTags
    : intent.attributes.length
      ? intent.attributes
      : [];

  return {
    rawQuery,
    normalizedQuery,
    queryHash,
    intent,
    explicit,
    category,
    town,
    text,
    effectivePriceBucket,
    effectiveVibeTags,
    scoring: buildIntentScoringSignals(intent, category.resolvedCategorySlugs),
    prefetchVectorEmbedding,
    precomputedQueryEmbedding: input.precomputedQueryEmbedding,
    model: input.model,
    openaiKey: input.openaiKey,
    sessionId: input.sessionId,
    userId: input.userId,
    userLat: input.userLat,
    userLng: input.userLng,
  };
}
