/**
 * Display titles for storefront `business_categories` (DB slug unchanged).
 * Slug `services` → "Service businesses" so it is not confused with regional
 * service providers (`/services`, `type=services`) or vendor specialties.
 */

export const STOREFRONT_SERVICES_CATEGORY_SLUG = "services" as const;

const DISPLAY_TITLE_BY_SLUG: Record<string, string> = {
  [STOREFRONT_SERVICES_CATEGORY_SLUG]: "Service businesses",
};

/** User-facing category name for hubs, search sidebar, and cards. */
export function displayStorefrontCategoryTitle(slug: string, dbTitle: string): string {
  const key = slug.trim().toLowerCase();
  return DISPLAY_TITLE_BY_SLUG[key] ?? dbTitle;
}
