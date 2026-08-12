import {
  BUSINESS_CATEGORY_GROUP_ICONS,
  BUSINESS_CATEGORY_GROUP_LABELS,
  BUSINESS_CATEGORY_GROUP_SLUGS,
  type BusinessCategoryGroupSlug,
} from "@/lib/business-categories/groups";

export const BUSINESS_BROWSE_HUB_PATH = "/businesses" as const;

export type BusinessBrowseGroupNavItem = {
  slug: BusinessCategoryGroupSlug;
  title: string;
  icon: string;
  href: string;
};

/** Public URL segment for a browse group (e.g. `restaurants-and-bars`). */
export function businessBrowseGroupPublicSegment(groupSlug: BusinessCategoryGroupSlug): string {
  return groupSlug.replace(/_/g, "-");
}

export function businessBrowseGroupFromPublicSegment(
  segment: string,
): BusinessCategoryGroupSlug | null {
  const norm = segment.trim().toLowerCase().replace(/-/g, "_");
  return isBusinessBrowseGroupSlug(norm) ? norm : null;
}

/** Town-grouped browse group detail page (footer / hub links). */
export function businessBrowseGroupHubPath(groupSlug: BusinessCategoryGroupSlug): string {
  return `${BUSINESS_BROWSE_HUB_PATH}/${businessBrowseGroupPublicSegment(groupSlug)}`;
}

/** Static browse groups for nav grids (order matches categories hub). */
export function listBusinessBrowseGroupNav(): BusinessBrowseGroupNavItem[] {
  return BUSINESS_CATEGORY_GROUP_SLUGS.map((slug) => ({
    slug,
    title: BUSINESS_CATEGORY_GROUP_LABELS[slug],
    icon: BUSINESS_CATEGORY_GROUP_ICONS[slug],
    href: businessBrowseGroupHubPath(slug),
  }));
}

export function isBusinessBrowseGroupSlug(
  value: string,
): value is BusinessCategoryGroupSlug {
  return (BUSINESS_CATEGORY_GROUP_SLUGS as readonly string[]).includes(value);
}

export { BUSINESS_CATEGORY_GROUP_SLUGS };
