import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BUSINESS_CATEGORY_GROUP_MEMBERS,
  type BusinessCategoryGroupSlug,
} from "@/lib/business-categories/groups";
import {
  SERVICE_CATEGORY_GROUP_MEMBERS,
  SERVICE_CATEGORY_GROUP_SLUGS,
} from "@/lib/service-categories/groups";
import { DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";

export {
  normalizeServiceCategoryGroupSlug,
  normalizeStorefrontCategoryGroupSlug,
} from "@/lib/discovery-filters/category-group-slugs";

export async function resolveStorefrontCategoryIds(
  supabase: SupabaseClient,
  groupSlug: BusinessCategoryGroupSlug,
): Promise<string[]> {
  const memberSlugs = BUSINESS_CATEGORY_GROUP_MEMBERS[groupSlug];
  if (!memberSlugs.length) return [];

  const { data, error } = await supabase
    .from("business_categories")
    .select("id")
    .in("slug", [...memberSlugs])
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS);

  if (error) {
    console.error("resolveStorefrontCategoryIds", groupSlug, error);
    return [];
  }

  return (data ?? []).map((row) => String((row as { id: string }).id));
}

export async function resolveServiceCategoryIds(
  supabase: SupabaseClient,
  groupSlug: (typeof SERVICE_CATEGORY_GROUP_SLUGS)[number],
): Promise<string[]> {
  const memberSlugs = SERVICE_CATEGORY_GROUP_MEMBERS[groupSlug];
  if (!memberSlugs.length) return [];

  const { data, error } = await supabase
    .from("service_categories")
    .select("id")
    .in("slug", [...memberSlugs])
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS);

  if (error) {
    console.error("resolveServiceCategoryIds", groupSlug, error);
    return [];
  }

  return (data ?? []).map((row) => String((row as { id: string }).id));
}
