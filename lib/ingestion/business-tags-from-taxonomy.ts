import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Tag row ids for taxonomy hint strings that match `tags.slug` (exact, lowercased).
 */
export async function resolveTagIdsForTaxonomyHints(
  supabase: SupabaseClient,
  typeHints: string[] | undefined,
): Promise<number[]> {
  if (!typeHints?.length) return [];
  const normalized = [...new Set(typeHints.map((t) => t.toLowerCase()))];
  const { data: tagRows, error } = await supabase
    .from("tags")
    .select("id")
    .in("slug", normalized);
  if (error || !tagRows?.length) return [];
  return tagRows.map((t) => t.id as number);
}

/**
 * Link `business_tags` from taxonomy hints matching `tags.slug` (exact, lowercased).
 */
export async function linkTaxonomyHintsToBusinessTags(
  supabase: SupabaseClient,
  businessId: string,
  typeHints: string[] | undefined,
): Promise<void> {
  const ids = await resolveTagIdsForTaxonomyHints(supabase, typeHints);
  if (!ids.length) return;
  const rows = ids.map((tag_id) => ({
    business_id: businessId,
    tag_id,
    source: "taxonomy_hint",
    confidence: 0.9,
  }));
  await supabase.from("business_tags").insert(rows);
}
