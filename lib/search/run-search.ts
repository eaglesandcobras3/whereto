import { getServiceSupabase } from "@/lib/supabase/service-role";
import { hashQuery, normalizeQuery } from "@/lib/query-normalize";
import { searchIntentSchema } from "@/lib/intent-schema";
import {
  buildRecommendationSet,
  resolveIntent,
  resolveLocationScopeForIntent,
} from "@/lib/search/recommendation-set";
import type { SearchCandidateRankOrder } from "@/lib/scoring";
import type { SearchResultPayload } from "@/lib/search/types";

export type { SearchResultPayload } from "@/lib/search/types";

export async function runSearch(options: {
  rawQuery: string;
  userId: string | null;
  model: string;
  openaiKey: string | undefined;
  priceLevel?: number;
  page?: number;
  pageSize?: number;
  /** When set, ranking and AI candidates are constrained to this category slug (e.g. \`services\` for /search?type=services). */
  forcedCategorySlug?: string | null;
  /** When set, excludes this category slug from candidates (e.g. hide services from businesses browse). */
  excludedCategorySlug?: string | null;
  /** Optional location mode filter for candidate rows. */
  requiredHasPhysicalLocation?: boolean;
  /** Hard filter to a single `towns.id` (search UI). */
  constrainTownId?: number;
  sortMode?: SearchCandidateRankOrder;
}): Promise<SearchResultPayload> {
  const supabase = getServiceSupabase();
  const normalized = normalizeQuery(options.rawQuery);
  const CACHE_VERSION = "search-v2-min12";
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
  if (options.constrainTownId != null && Number.isFinite(options.constrainTownId)) {
    cacheBasis = `${cacheBasis}::__town__:${options.constrainTownId}`;
  }
  if ((options.page ?? 1) > 1) {
    cacheBasis = `${cacheBasis}::__page__:${options.page}`;
  }
  if (options.pageSize && options.pageSize !== 12) {
    cacheBasis = `${cacheBasis}::__page_size__:${options.pageSize}`;
  }
  const queryHash = hashQuery(cacheBasis);

  const { data: cached } = await supabase
    .from("query_cache")
    .select("id, response_json, business_ids, hit_count")
    .eq("query_hash", queryHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (cached?.response_json) {
    const prevHits = (cached.hit_count as number) ?? 0;
    void supabase
      .from("query_cache")
      .update({
        hit_count: prevHits + 1,
        last_hit_at: new Date().toISOString(),
      })
      .eq("id", cached.id);
    const body = cached.response_json as Record<string, unknown>;
    return {
      ...(body as Omit<SearchResultPayload, "cached" | "cache_id">),
      query_hash: queryHash,
      normalized_query: normalized,
      cached: true,
      cache_id: cached.id,
    };
  }

  let intent = await resolveIntent(
    options.rawQuery,
    normalized,
    options.model,
    options.openaiKey,
  );
  if (options.forcedCategorySlug) {
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
  const locationScope = await resolveLocationScopeForIntent(supabase, intent);

  const { enriched, businessIds } = await buildRecommendationSet({
    supabase,
    rawQuery: options.rawQuery,
    normalizedQuery: normalized,
    intent,
    userId: options.userId,
    model: options.model,
    openaiKey: options.openaiKey,
    locationScope,
    priceLevel: options.priceLevel,
    requiredHasPhysicalLocation: options.requiredHasPhysicalLocation,
    excludedCategorySlug: options.excludedCategorySlug,
    page: options.page,
    pageSize: options.pageSize,
    constrainTownId: options.constrainTownId,
    sortMode: options.sortMode,
  });

  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const fullPayload = {
    ...enriched,
    query_hash: queryHash,
  };

  const { data: inserted, error: insErr } = await supabase
    .from("query_cache")
    .insert({
      query_hash: queryHash,
      normalized_query: cacheBasis,
      raw_queries: [options.rawQuery],
      response_json: fullPayload,
      business_ids: businessIds,
      expires_at: expires,
    })
    .select("id")
    .single();

  if (insErr) {
    console.error("query_cache insert", insErr);
  }

  return {
    query: enriched.query,
    query_hash: queryHash,
    normalized_query: enriched.normalized_query,
    summary: enriched.summary,
    total_results: enriched.total_results,
    page: enriched.page,
    page_size: enriched.page_size,
    recommendations: enriched.recommendations,
    suggestions: enriched.suggestions,
    cached: false,
    cache_id: inserted?.id,
  };
}
