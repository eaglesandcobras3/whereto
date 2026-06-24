export type BrowseBusinessPreview = {
  id: string;
  name: string;
  slug: string;
  hero_image_url: string | null;
  ai_one_liner: string | null;
  ai_summary: string | null;
};

/** Town + area pages: fixed category order (`business_categories.slug`). */
export const PLACE_CATEGORY_SLUG_ORDER = [
  "restaurants",
  "shopping",
  "boutiques",
  "coffee_shops",
  "bars",
  "candy_sweets",
  "ice_cream",
  "specialty_retail",
  "activities",
  "events",
  "beaches",
  "services",
  "banking",
  "contractors",
] as const;

export const PLACE_CATEGORY_ICONS: Record<string, string> = {
  restaurants: "restaurant",
  coffee_shops: "coffee",
  bars: "local_bar",
  activities: "kayaking",
  shopping: "shopping_bag",
  boutiques: "checkroom",
  candy_sweets: "cake",
  ice_cream: "icecream",
  specialty_retail: "storefront",
  services: "home_repair_service",
  events: "event",
  beaches: "beach_access",
  banking: "account_balance",
  contractors: "construction",
};

/** Card grid cap on town/area hubs; full pool is still linked when over this count. */
export const PER_PLACE_CATEGORY_PREVIEW = 8;

export type PlaceCategorySection = {
  id: string;
  title: string;
  slug: string;
  businesses: BrowseBusinessPreview[];
  totalCount: number;
};
