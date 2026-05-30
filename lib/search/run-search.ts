import { getServiceSupabase } from "@/lib/supabase/service-role";
import { normalizeQuery } from "@/lib/query-normalize";
import { searchIntentSchema } from "@/lib/intent-schema";
import { resolveIntent } from "@/lib/search/recommendation-set";
import { executeSearchFromPlan } from "@/lib/search/execute-search-from-plan";
import { embedNormalizedSearchQuery } from "@/lib/search/query-embedding";
import { assembleSearchPlan } from "@/lib/search/resolve-search-plan";
import {
  buildSearchQueryHash,
  normalizeExplicitConstraints,
  type SearchPriceBucket,
} from "@/lib/search/search-plan";
import { searchQueryEmbeddingsEnabled } from "@/lib/search/search-openai-flags";
import type { SearchCandidateRankOrder } from "@/lib/scoring";
import type { SearchResultPayload } from "@/lib/search/types";

export type { SearchResultPayload } from "@/lib/search/types";
export type { SearchPriceBucket };

/**
 * Text search over Directus-backed `businesses` (no `query_cache` / legacy scoring).
 *
 * Pipeline: normalize → intent (+ optional embed) → {@link assembleSearchPlan} →
 * {@link executeSearchFromPlan} → hybrid RPC or ILIKE.
 */
export async function runSearch(options: {
  rawQuery: string;
  userId?: string | null;
  model: string;
  openaiKey: string | undefined;
  page?: number;
  pageSize?: number;
  forcedCategorySlug?: string | null;
  excludedCategorySlug?: string | null;
  requiredHasPhysicalLocation?: boolean;
  requiredIsServiceBusiness?: boolean;
  constrainTownId?: string;
  constrainTownIds?: string[];
  constrainAreaId?: string;
  constrainCategorySlug?: string | null;
  constrainCategorySlugs?: string[];
  sortMode?: SearchCandidateRankOrder;
  skipIlikeTextFilter?: boolean;
  scopeOverride?: "in" | "near" | "anywhere";
  constrainPriceBucket?: SearchPriceBucket | null;
  constrainVibeTags?: string[];
  sessionId?: string | null;
  /** User device coordinates for geo-distance scoring (WGS-84 decimal degrees). */
  userLat?: number | null;
  userLng?: number | null;
  /** Include full _debug info in the response (admin debugger only). */
  includeDebug?: boolean;
}): Promise<SearchResultPayload> {
  const supabase = getServiceSupabase();
  const normalized = normalizeQuery(options.rawQuery);
  const explicit = normalizeExplicitConstraints(options);
  const queryHash = buildSearchQueryHash(normalized, explicit);

  const prefetchVectorEmbedding =
    Boolean(options.openaiKey) &&
    searchQueryEmbeddingsEnabled() &&
    !explicit.constrainAreaId &&
    !explicit.pageBrowseWithoutQuery;

  let intent: Awaited<ReturnType<typeof resolveIntent>>;
  let precomputedQueryEmbedding: number[] | null | undefined;

  if (prefetchVectorEmbedding) {
    [intent, precomputedQueryEmbedding] = await Promise.all([
      resolveIntent(options.rawQuery, normalized, options.model, options.openaiKey),
      embedNormalizedSearchQuery(normalized, options.openaiKey!),
    ]);
  } else {
    intent = await resolveIntent(
      options.rawQuery,
      normalized,
      options.model,
      options.openaiKey,
    );
    precomputedQueryEmbedding = undefined;
  }

  if (intent.result_count < 10) {
    intent = searchIntentSchema.parse({ ...intent, result_count: 10 });
  }

  const plan = await assembleSearchPlan(supabase, {
    rawQuery: options.rawQuery,
    normalizedQuery: normalized,
    queryHash,
    intent,
    explicit,
    prefetchVectorEmbedding,
    precomputedQueryEmbedding,
    model: options.model,
    openaiKey: options.openaiKey,
    sessionId: options.sessionId,
    userId: options.userId,
    userLat: options.userLat,
    userLng: options.userLng,
  });

  return executeSearchFromPlan(supabase, plan, options.includeDebug ?? false);
}
