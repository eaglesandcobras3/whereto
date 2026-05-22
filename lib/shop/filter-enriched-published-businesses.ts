import type { SupabaseClient } from "@supabase/supabase-js";
import type { EnrichedRecommendationPayload } from "@/lib/search/recommendation-set";
import {
  BROWSE_VISIBLE_NOT_HIDDEN,
  DIRECTUS_PUBLISHED_STATUS,
} from "@/lib/shop/public-listing-filters";

const ID_CHUNK = 120;

/**
 * Drops non-published / hidden-archived picks from cached `query_cache.response_json`.
 * Mirrors live `/search` filtering so drafts never appear via SEO intent pages.
 */
export async function filterEnrichedToPublishedBusinesses(
  supabase: SupabaseClient,
  enriched: EnrichedRecommendationPayload | null | undefined,
): Promise<EnrichedRecommendationPayload | null> {
  if (!enriched?.recommendations?.length) return enriched ?? null;
  const ids = [...new Set(enriched.recommendations.map((r) => r.business_id))];
  const allowed = new Set<string>();

  for (let i = 0; i < ids.length; i += ID_CHUNK) {
    const chunk = ids.slice(i, i + ID_CHUNK);
    const { data } = await supabase
      .from("businesses_view")
      .select("id")
      .in("id", chunk)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .is("archived_at", null)
      .or(BROWSE_VISIBLE_NOT_HIDDEN);
    for (const row of data ?? []) {
      allowed.add(String((row as { id: string }).id));
    }
  }

  const recommendations = enriched.recommendations
    .filter((r) => allowed.has(r.business_id))
    .map((r, idx) => ({ ...r, rank: idx + 1 }));

  return { ...enriched, recommendations };
}
