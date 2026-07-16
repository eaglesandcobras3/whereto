import type { ServiceCategoryRow } from "@/lib/data/service-vendors-hub";
import {
  SERVICE_CATEGORY_GROUP_LABELS,
  SERVICE_CATEGORY_GROUP_MEMBERS,
  SERVICE_CATEGORY_GROUP_SLUGS,
  type ServiceCategoryGroupSlug,
} from "@/lib/service-categories/groups";

export type GroupedListedServiceCategories = {
  groupSlug: ServiceCategoryGroupSlug;
  groupLabel: string;
  totalVendors: number;
  categories: ServiceCategoryRow[];
};

/** Groups specialties that have listings, in hub section order. */
export function groupListedServiceCategories(
  categories: ServiceCategoryRow[],
): GroupedListedServiceCategories[] {
  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  const grouped: GroupedListedServiceCategories[] = [];

  for (const groupSlug of SERVICE_CATEGORY_GROUP_SLUGS) {
    const listed = SERVICE_CATEGORY_GROUP_MEMBERS[groupSlug]
      .map((slug) => bySlug.get(slug))
      .filter((c): c is ServiceCategoryRow => Boolean(c && c.vendor_count > 0));
    if (!listed.length) continue;
    grouped.push({
      groupSlug,
      groupLabel: SERVICE_CATEGORY_GROUP_LABELS[groupSlug],
      totalVendors: listed.reduce((sum, c) => sum + c.vendor_count, 0),
      categories: listed,
    });
  }

  const assigned = new Set<string>(
    SERVICE_CATEGORY_GROUP_SLUGS.flatMap((g) => [...SERVICE_CATEGORY_GROUP_MEMBERS[g]]),
  );
  const ungrouped = categories.filter((c) => c.vendor_count > 0 && !assigned.has(c.slug));
  if (ungrouped.length) {
    const catchAll = grouped.find((g) => g.groupSlug === "other_services");
    if (catchAll) {
      catchAll.categories.push(...ungrouped);
      catchAll.totalVendors += ungrouped.reduce((sum, c) => sum + c.vendor_count, 0);
    } else {
      grouped.push({
        groupSlug: "other_services",
        groupLabel: SERVICE_CATEGORY_GROUP_LABELS.other_services,
        totalVendors: ungrouped.reduce((sum, c) => sum + c.vendor_count, 0),
        categories: ungrouped,
      });
    }
  }

  return grouped;
}

export function findGroupForSpecialtySlug(
  groups: GroupedListedServiceCategories[],
  specialtySlug: string | null,
): ServiceCategoryGroupSlug | null {
  if (!specialtySlug) return null;
  for (const g of groups) {
    if (g.categories.some((c) => c.slug === specialtySlug)) return g.groupSlug;
  }
  return null;
}
