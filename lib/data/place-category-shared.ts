export type BrowseBusinessPreview = {
  id: string;
  name: string;
  slug: string;
  hero_image_url: string | null;
  ai_one_liner: string | null;
  ai_summary: string | null;
};

/** Town + area pages: priority sort for `business_categories.slug` (expanded taxonomy). */
export const PLACE_CATEGORY_SLUG_ORDER = [
  "restaurants",
  "coffee_shops",
  "bars",
  "shopping",
  "boutiques",
  "jewelry",
  "specialty_retail",
  "footwear",
  "candy_sweets",
  "ice_cream",
  "donut_shops",
  "desserts",
  "activities",
  "entertainment",
  "events",
  "beaches",
  "fitness",
  "beauty_wellness",
  "spas",
  "hair_salons",
  "nail_salons",
  "services",
  "home_services",
  "contractors_handyman",
  "cleaning_services",
  "real_estate",
  "insurance",
  "legal_services",
  "financial_accounting",
  "photography",
  "professional_services",
] as const;

export const PLACE_CATEGORY_ICONS: Record<string, string> = {
  restaurants: "restaurant",
  coffee_shops: "coffee",
  bars: "local_bar",
  activities: "kayaking",
  shopping: "shopping_bag",
  boutiques: "checkroom",
  jewelry: "diamond",
  candy_sweets: "cake",
  ice_cream: "icecream",
  donut_shops: "bakery_dining",
  desserts: "cake",
  specialty_retail: "storefront",
  footwear: "steps",
  services: "home_repair_service",
  home_services: "handyman",
  contractors_handyman: "construction",
  cleaning_services: "cleaning_services",
  entertainment: "theater_comedy",
  events: "event",
  beaches: "beach_access",
  fitness: "fitness_center",
  beauty_wellness: "spa",
  spas: "spa",
  hair_salons: "content_cut",
  nail_salons: "brush",
  real_estate: "real_estate_agent",
  insurance: "shield",
  legal_services: "gavel",
  financial_accounting: "account_balance",
  photography: "photo_camera",
  professional_services: "work",
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
