import {
  SERVICE_CATEGORY_GROUP_ICONS,
  SERVICE_CATEGORY_GROUP_LABELS,
  SERVICE_CATEGORY_GROUP_SLUGS,
  type ServiceCategoryGroupSlug,
} from "@/lib/service-categories/groups";
import { SERVICE_VENDORS_HUB_PATH } from "@/lib/routes/service-vendors-hub";

export type ServiceBrowseGroupNavItem = {
  slug: ServiceCategoryGroupSlug;
  title: string;
  icon: string;
  href: string;
};

export function serviceBrowseGroupHubPath(groupSlug: ServiceCategoryGroupSlug): string {
  return `${SERVICE_VENDORS_HUB_PATH}#${groupSlug}`;
}

/** Static browse groups for nav grids (order matches services hub). */
export function listServiceBrowseGroupNav(): ServiceBrowseGroupNavItem[] {
  return SERVICE_CATEGORY_GROUP_SLUGS.map((slug) => ({
    slug,
    title: SERVICE_CATEGORY_GROUP_LABELS[slug],
    icon: SERVICE_CATEGORY_GROUP_ICONS[slug],
    href: serviceBrowseGroupHubPath(slug),
  }));
}

export function isServiceBrowseGroupSlug(value: string): value is ServiceCategoryGroupSlug {
  return (SERVICE_CATEGORY_GROUP_SLUGS as readonly string[]).includes(value);
}
