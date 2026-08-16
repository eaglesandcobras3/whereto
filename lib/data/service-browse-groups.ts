import "server-only";

import { getServiceSupabase } from "@/lib/supabase/service-role";
import {
  DIRECTUS_PUBLISHED_STATUS,
} from "@/lib/shop/public-listing-filters";
import {
  browseSectionForCategorySlug,
  browseSectionIcon,
  isUnifiedRollupSlug,
  listUnifiedRollupOrder,
  unifiedRollupHubPath,
} from "@/lib/categories/unified-browse";
import {
  SERVICE_CATEGORY_GROUP_SLUGS,
  serviceCategoryGroupForSlug,
  SERVICE_CATEGORY_GROUP_ICONS,
  SERVICE_CATEGORY_GROUP_LABELS,
  type ServiceCategoryGroupSlug,
} from "@/lib/service-categories/groups";
import type { ServiceCategorySlug } from "@/lib/service-categories/constants";
import type { ServiceBrowseGroupNavItem } from "@/lib/service-categories/browse-group-nav";
import { serviceBrowseGroupHubPath } from "@/lib/service-categories/browse-group-nav";

export type ListedServiceBrowseGroup = ServiceBrowseGroupNavItem & {
  vendorCount: number;
};

/**
 * Service browse groups with at least one vendor (hub / footer).
 * Prefers unified primary category rollups; falls back to legacy service_categories groups.
 */
export async function getListedServiceBrowseGroups(): Promise<ListedServiceBrowseGroup[]> {
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from("businesses_view")
    .select("id, business_categories ( slug ), service_categories ( slug )")
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .eq("is_service_business", true)
    .limit(5000);

  if (error) {
    console.error("service browse groups: count query", error);
    return [];
  }

  const unifiedCounts = new Map<string, { title: string; count: number }>();
  const legacyCounts = new Map<ServiceCategoryGroupSlug, number>();
  for (const groupSlug of SERVICE_CATEGORY_GROUP_SLUGS) {
    legacyCounts.set(groupSlug, 0);
  }

  for (const row of data ?? []) {
    const r = row as {
      business_categories: { slug?: string } | null;
      service_categories: { slug?: string } | null;
    };
    const primarySection = browseSectionForCategorySlug(r.business_categories?.slug ?? null);
    if (primarySection) {
      const prev = unifiedCounts.get(primarySection.id);
      if (prev) prev.count += 1;
      else unifiedCounts.set(primarySection.id, { title: primarySection.title, count: 1 });
      continue;
    }
    const slug = r.service_categories?.slug?.trim().toLowerCase() as
      | ServiceCategorySlug
      | undefined;
    if (!slug) continue;
    const groupSlug = serviceCategoryGroupForSlug(slug);
    if (!groupSlug) continue;
    legacyCounts.set(groupSlug, (legacyCounts.get(groupSlug) ?? 0) + 1);
  }

  const groups: ListedServiceBrowseGroup[] = [];
  const seen = new Set<string>();

  for (const id of listUnifiedRollupOrder()) {
    const entry = unifiedCounts.get(id);
    if (!entry || entry.count === 0) continue;
    seen.add(id);
    groups.push({
      slug: id as ServiceCategoryGroupSlug,
      title: entry.title,
      icon: browseSectionIcon(id),
      href: isUnifiedRollupSlug(id) ? unifiedRollupHubPath(id) : serviceBrowseGroupHubPath(id as ServiceCategoryGroupSlug),
      vendorCount: entry.count,
    });
  }

  for (const slug of SERVICE_CATEGORY_GROUP_SLUGS) {
    if (seen.has(slug)) continue;
    const vendorCount = legacyCounts.get(slug) ?? 0;
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
