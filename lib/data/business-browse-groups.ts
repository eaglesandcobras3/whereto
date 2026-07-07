import "server-only";

import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";
import {
  BROWSE_VISIBLE_NOT_HIDDEN,
  DIRECTUS_PUBLISHED_STATUS,
} from "@/lib/shop/public-listing-filters";
import { businessCategoryGroupForSlug } from "@/lib/business-categories/groups";
import {
  BUSINESS_CATEGORY_GROUP_ICONS,
  BUSINESS_CATEGORY_GROUP_LABELS,
  BUSINESS_CATEGORY_GROUP_SLUGS,
  type BusinessCategoryGroupSlug,
} from "@/lib/business-categories/groups";
import type { BusinessBrowseGroupNavItem } from "@/lib/business-categories/browse-group-nav";
import { businessBrowseGroupHubPath } from "@/lib/business-categories/browse-group-nav";

export type ListedBusinessBrowseGroup = BusinessBrowseGroupNavItem & {
  listingCount: number;
};

/** Storefront browse groups that have at least one listing (hub / footer / businesses page). */
export async function getListedBusinessBrowseGroups(): Promise<ListedBusinessBrowseGroup[]> {
  const supabase = getServiceSupabaseOrNull();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("businesses_view")
    .select("id, business_categories ( slug )")
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .eq("is_storefront", true)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .limit(5000);

  if (error) {
    console.error("business browse groups: count query", error);
    return [];
  }

  const counts = new Map<BusinessCategoryGroupSlug, number>();
  for (const groupSlug of BUSINESS_CATEGORY_GROUP_SLUGS) {
    counts.set(groupSlug, 0);
  }

  for (const row of data ?? []) {
    const cat = (row as { business_categories: { slug?: string } | null }).business_categories;
    const groupSlug = businessCategoryGroupForSlug(cat?.slug ?? null);
    if (!groupSlug) continue;
    counts.set(groupSlug, (counts.get(groupSlug) ?? 0) + 1);
  }

  const groups: ListedBusinessBrowseGroup[] = [];
  for (const slug of BUSINESS_CATEGORY_GROUP_SLUGS) {
    const listingCount = counts.get(slug) ?? 0;
    if (listingCount === 0) continue;
    groups.push({
      slug,
      title: BUSINESS_CATEGORY_GROUP_LABELS[slug],
      icon: BUSINESS_CATEGORY_GROUP_ICONS[slug],
      href: businessBrowseGroupHubPath(slug),
      listingCount,
    });
  }

  return groups;
}
