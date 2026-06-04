import "server-only";

import { getServiceSupabase } from "@/lib/supabase/service-role";
import {
  BIZ_CATEGORY_SELECT,
  groupBusinessesByCategorySections,
  rowToCategoryBusiness,
  type PlaceCategorySection,
} from "@/lib/data/place-category-sections";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";

export async function getServiceVendorCategorySections(): Promise<PlaceCategorySection[]> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("businesses_view")
    .select(BIZ_CATEGORY_SELECT)
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .eq("is_service_business", true)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .order("title", { ascending: true })
    .limit(500);

  if (error) {
    console.error("service vendors hub: businesses query", error);
    return [];
  }

  const businesses = (data ?? []).map((row) =>
    rowToCategoryBusiness(row as Record<string, unknown>),
  );
  return groupBusinessesByCategorySections(businesses);
}

export async function countServiceVendors(): Promise<number> {
  const supabase = getServiceSupabase();
  const { count, error } = await supabase
    .from("businesses_view")
    .select("id", { count: "exact", head: true })
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .eq("is_service_business", true)
    .or(BROWSE_VISIBLE_NOT_HIDDEN);

  if (error) {
    console.error("service vendors hub: count query", error);
    return 0;
  }
  return count ?? 0;
}
