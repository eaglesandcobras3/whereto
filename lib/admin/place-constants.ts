/** Shared place admin constants (safe for client components). */

export const PLACE_STATUSES = ["draft", "published", "archived"] as const;
export type PlaceStatus = (typeof PLACE_STATUSES)[number];

export const AREA_TYPES = [
  "shopping_area",
  "district",
  "square",
  "development",
  "neighborhood",
  "point_of_interest",
] as const;
export type AreaType = (typeof AREA_TYPES)[number];

export const GUIDE_ADMIN_STATUS_FILTERS = ["active", "draft", "published", "archived"] as const;
export type GuideAdminStatusFilter = (typeof GUIDE_ADMIN_STATUS_FILTERS)[number];

export function isGuideAdminStatusFilter(value: string): value is GuideAdminStatusFilter {
  return (GUIDE_ADMIN_STATUS_FILTERS as readonly string[]).includes(value);
}
