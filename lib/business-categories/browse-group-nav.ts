import {
  BUSINESS_CATEGORY_GROUP_ICONS,
  BUSINESS_CATEGORY_GROUP_LABELS,
  BUSINESS_CATEGORY_GROUP_SLUGS,
  type BusinessCategoryGroupSlug,
} from "@/lib/business-categories/groups";

export const BUSINESS_BROWSE_HUB_PATH = "/categories" as const;

export type BusinessBrowseGroupNavItem = {
  slug: BusinessCategoryGroupSlug;
  title: string;
  icon: string;
  href: string;
};

export function businessBrowseGroupHubPath(groupSlug: BusinessCategoryGroupSlug): string {
  return `${BUSINESS_BROWSE_HUB_PATH}#${groupSlug}`;
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
