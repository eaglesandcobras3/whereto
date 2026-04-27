import { getServiceSupabase } from "@/lib/supabase/service-role";
import { hashQuery, normalizeQuery } from "@/lib/query-normalize";
import { searchIntentSchema } from "@/lib/intent-schema";
import { resolveIntent } from "@/lib/search/recommendation-set";
import { buildMinimalSearchResult } from "@/lib/search/recommendation-set-minimal";
import type { SearchCandidateRankOrder } from "@/lib/scoring";
import type { SearchResultPayload } from "@/lib/search/types";

export type { SearchResultPayload } from "@/lib/search/types";

/**
 * Text search over Directus-backed `businesses` (no `query_cache` / legacy scoring).
 */
export async function runSearch(options: {
  rawQuery: string;
  userId: string | null;
  model: string;
  openaiKey: string | undefined;
  priceLevel?: number;
  page?: number;
  pageSize?: number;
  forcedCategorySlug?: string | null;
  excludedCategorySlug?: string | null;
  requiredHasPhysicalLocation?: boolean;
  /** `towns.id` (UUID) from search UI. */
  constrainTownId?: string;
  /** `areas.id` (UUID): businesses in this area via `area_id` or `area_businesses`. */
  constrainAreaId?: string;
  /**
   * `business_categories.slug` from search UI. When set, filters by primary category and
   * overrides the AI-parsed category (intent) so URL filters stay predictable.
   */
  constrainCategorySlug?: string | null;
  sortMode?: SearchCandidateRankOrder;
  /** `?type=businesses` / `services` with no `q`: list all visible listings without ilike. */
  skipIlikeTextFilter?: boolean;
}): Promise<SearchResultPayload> {
  const supabase = getServiceSupabase();
  const normalized = normalizeQuery(options.rawQuery);
  const CACHE_VERSION = "search-v4-public-image-url";
  let cacheBasis = `${normalized}::__v__:${CACHE_VERSION}`;
  if (options.forcedCategorySlug) {
    cacheBasis = `${cacheBasis}::__forced_cat__:${options.forcedCategorySlug}`;
  }
  if (options.excludedCategorySlug) {
    cacheBasis = `${cacheBasis}::__excluded_cat__:${options.excludedCategorySlug}`;
  }
  if (typeof options.requiredHasPhysicalLocation === "boolean") {
    cacheBasis = `${cacheBasis}::__physical__:${options.requiredHasPhysicalLocation ? "yes" : "no"}`;
  }
  if (options.sortMode && options.sortMode !== "relevance") {
    cacheBasis = `${cacheBasis}::__sort__:${options.sortMode}`;
  }
  if (options.constrainTownId) {
    cacheBasis = `${cacheBasis}::__town__:${options.constrainTownId}`;
  }
  if (options.constrainAreaId) {
    cacheBasis = `${cacheBasis}::__area__:${options.constrainAreaId}`;
  }
  if (options.constrainCategorySlug) {
    cacheBasis = `${cacheBasis}::__cat__:${options.constrainCategorySlug}`;
  }
  if (options.skipIlikeTextFilter) {
    cacheBasis = `${cacheBasis}::__browse__:${"no_ilike"}`;
  }
  if ((options.page ?? 1) > 1) {
    cacheBasis = `${cacheBasis}::__page__:${options.page}`;
  }
  if (options.pageSize && options.pageSize !== 12) {
    cacheBasis = `${cacheBasis}::__page_size__:${options.pageSize}`;
  }
  const queryHash = hashQuery(cacheBasis);

  let intent = await resolveIntent(
    options.rawQuery,
    normalized,
    options.model,
    options.openaiKey,
  );
  if (options.forcedCategorySlug && !options.constrainCategorySlug) {
    intent = searchIntentSchema.parse({
      ...intent,
      category: options.forcedCategorySlug,
    });
  }
  if (intent.result_count < 10) {
    intent = searchIntentSchema.parse({
      ...intent,
      result_count: 10,
    });
  }

  const explicitCategorySlug = options.constrainCategorySlug ?? options.forcedCategorySlug;
  let filterCategoryId: string | null = null;
  if (explicitCategorySlug) {
    const { data: cat } = await supabase
      .from("business_categories")
      .select("id")
      .eq("slug", explicitCategorySlug)
      .maybeSingle();
    if (cat?.id) filterCategoryId = cat.id as string;
  } else if (intent.category && !options.skipIlikeTextFilter) {
    // Browse without `q` uses label "Businesses" / "Services" — intent still defaults to e.g. restaurants.
    // Applying that category would return 0 rows when listings are in other primary categories.
    const { data: cat } = await supabase
      .from("business_categories")
      .select("id")
      .eq("slug", intent.category)
      .maybeSingle();
    if (cat?.id) filterCategoryId = cat.id as string;
  }

  return buildMinimalSearchResult(supabase, {
    rawQuery: options.rawQuery,
    normalizedQuery: normalized,
    queryHash,
    model: options.model,
    openaiKey: options.openaiKey,
    page: options.page,
    pageSize: options.pageSize,
    constrainTownId: options.constrainTownId,
    constrainAreaId: options.constrainAreaId,
    requiredHasPhysicalLocation: options.requiredHasPhysicalLocation,
    sortMode: options.sortMode,
    primaryCategoryId: filterCategoryId,
    skipIlikeTextFilter: options.skipIlikeTextFilter,
  });
}
