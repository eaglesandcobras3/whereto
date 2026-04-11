import { getServiceSupabase } from "@/lib/supabase/service-role";
import { hashQuery, normalizeQuery } from "@/lib/query-normalize";
import {
  buildRecommendationSet,
  resolveIntent,
  resolveLocationScopeForIntent,
} from "@/lib/search/recommendation-set";
import type { SearchResultPayload } from "@/lib/search/types";

export type { SearchResultPayload } from "@/lib/search/types";

export async function runSearch(options: {
  rawQuery: string;
  userId: string | null;
  model: string;
  openaiKey: string | undefined;
  priceLevel?: number;
}): Promise<SearchResultPayload> {
  const supabase = getServiceSupabase();
  const normalized = normalizeQuery(options.rawQuery);
  const queryHash = hashQuery(normalized);

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

  const intent = await resolveIntent(
    options.rawQuery,
    normalized,
    options.model,
    options.openaiKey,
  );
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
      normalized_query: normalized,
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
    recommendations: enriched.recommendations,
    suggestions: enriched.suggestions,
    cached: false,
    cache_id: inserted?.id,
  };
}
