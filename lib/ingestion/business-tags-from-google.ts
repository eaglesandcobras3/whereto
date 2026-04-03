import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Tag row ids for any Google Place `types` value that matches `tags.slug` (exact, lowercased).
 */
export async function resolveTagIdsForGoogleTypes(
  supabase: SupabaseClient,
  googleTypes: string[] | undefined,
): Promise<number[]> {
  if (!googleTypes?.length) return [];
  const normalized = [...new Set(googleTypes.map((t) => t.toLowerCase()))];
  const { data: tagRows, error } = await supabase
    .from("tags")
    .select("id")
    .in("slug", normalized);
  if (error || !tagRows?.length) return [];
  return tagRows.map((t) => t.id as number);
}

/**
 * Link `business_tags` for any Google Place `types` value that matches a `tags.slug` (exact, lowercased).
 * Prefer discovery path using `insert_discovery_business_with_tags` RPC for atomicity.
 */
export async function linkGoogleTypesToBusinessTags(
  supabase: SupabaseClient,
  businessId: string,
  googleTypes: string[] | undefined,
): Promise<void> {
  const ids = await resolveTagIdsForGoogleTypes(supabase, googleTypes);
  if (!ids.length) return;
  const rows = ids.map((tag_id) => ({
    business_id: businessId,
    tag_id,
    source: "google",
    confidence: 0.9,
  }));
  await supabase.from("business_tags").insert(rows);
}
