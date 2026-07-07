import "server-only";

import { getServiceSupabase } from "@/lib/supabase/service-role";
import {
  BROWSE_VISIBLE_NOT_HIDDEN,
  DIRECTUS_PUBLISHED_STATUS,
} from "@/lib/shop/public-listing-filters";
import {
  SERVICE_CATEGORY_GROUP_ICONS,
  SERVICE_CATEGORY_GROUP_LABELS,
  SERVICE_CATEGORY_GROUP_SLUGS,
  serviceCategoryGroupForSlug,
  type ServiceCategoryGroupSlug,
} from "@/lib/service-categories/groups";
import type { ServiceCategorySlug } from "@/lib/service-categories/constants";
import type { ServiceBrowseGroupNavItem } from "@/lib/service-categories/browse-group-nav";
import { serviceBrowseGroupHubPath } from "@/lib/service-categories/browse-group-nav";

export type ListedServiceBrowseGroup = ServiceBrowseGroupNavItem & {
  vendorCount: number;
};

/** Service browse groups that have at least one vendor (hub / footer). */
export async function getListedServiceBrowseGroups(): Promise<ListedServiceBrowseGroup[]> {
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from("businesses_view")
    .select("id, service_categories ( slug )")
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .eq("is_service_business", true)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .limit(5000);

  if (error) {
    console.error("service browse groups: count query", error);
    return [];
  }

  const counts = new Map<ServiceCategoryGroupSlug, number>();
  for (const groupSlug of SERVICE_CATEGORY_GROUP_SLUGS) {
    counts.set(groupSlug, 0);
  }

  for (const row of data ?? []) {
    const spec = (row as { service_categories: { slug?: string } | null }).service_categories;
    const slug = spec?.slug?.trim().toLowerCase() as ServiceCategorySlug | undefined;
    if (!slug) continue;
    const groupSlug = serviceCategoryGroupForSlug(slug);
    if (!groupSlug) continue;
    counts.set(groupSlug, (counts.get(groupSlug) ?? 0) + 1);
  }

  const groups: ListedServiceBrowseGroup[] = [];
  for (const slug of SERVICE_CATEGORY_GROUP_SLUGS) {
    const vendorCount = counts.get(slug) ?? 0;
    if (vendorCount === 0) continue;
    groups.push({
      slug,
      title: SERVICE_CATEGORY_GROUP_LABELS[slug],
      icon: SERVICE_CATEGORY_GROUP_ICONS[slug],
      href: serviceBrowseGroupHubPath(slug),
      vendorCount,
    });
  }

  return groups;
}
