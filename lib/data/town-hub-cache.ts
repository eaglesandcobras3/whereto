import type { SupabaseClient } from "@supabase/supabase-js";
import type { EnrichedRecommendationPayload } from "@/lib/search/recommendation-set";

/**
 * Load a precomputed recommendation set from `query_cache` when present and not expired.
 */
export async function fetchCachedEnrichedByQueryKey(
  supabase: SupabaseClient,
  queryKey: string,
): Promise<EnrichedRecommendationPayload | null> {
  try {
    const { data } = await supabase
      .from("query_cache")
      .select("response_json, expires_at")
      .eq("query_key", queryKey)
      .maybeSingle();
    if (!data?.response_json) return null;
    const exp = data.expires_at as string | undefined;
    if (exp && new Date(exp).getTime() <= Date.now()) return null;
    const payload = data.response_json as EnrichedRecommendationPayload;
    if (!payload?.recommendations?.length) return null;
    return payload;
  } catch {
    return null;
  }
}
