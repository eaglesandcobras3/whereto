import type { SupabaseClient } from "@supabase/supabase-js";
import { inferCategorySlug } from "@/lib/search/infer-business-metadata";

/**
 * Best-effort category assignment for a new listing.
 * Returns a `business_categories.id` UUID, or null if inference fails.
 */
export async function inferStorefrontCategoryId(
  supabase: SupabaseClient,
  input: {
    title: string;
    description: string | null;
    isServiceBusiness: boolean;
  },
): Promise<string | null> {
  const slug =
    inferCategorySlug(input.title, input.description, input.isServiceBusiness);
  if (!slug) return null;

  const { data } = await supabase
    .from("business_categories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return data?.id ? String(data.id) : null;
}

export { inferBusinessType, inferCategorySlug } from "@/lib/search/infer-business-metadata";
