import type { GroupedListedServiceCategories } from "@/lib/service-categories/group-listed-categories";

export type ServiceSpecialtyChip = {
  slug: string;
  title: string;
  vendorCount: number;
  active: boolean;
};

export type ServiceSpecialtyBrowseGroup = {
  groupSlug: string;
  groupLabel: string;
  totalVendors: number;
  chips: ServiceSpecialtyChip[];
};

export function toServiceSpecialtyBrowseGroups(
  grouped: GroupedListedServiceCategories[],
  activeSpecialtySlug: string | null,
): ServiceSpecialtyBrowseGroup[] {
  return grouped.map((g) => ({
    groupSlug: g.groupSlug,
    groupLabel: g.groupLabel,
    totalVendors: g.totalVendors,
    chips: g.categories.map((c) => ({
      slug: c.slug,
      title: c.title,
      vendorCount: c.vendor_count,
      active: activeSpecialtySlug === c.slug,
    })),
  }));
}
