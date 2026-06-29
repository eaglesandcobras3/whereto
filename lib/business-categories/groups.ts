/**
 * End-user browse groupings for storefront listings (`is_storefront`).
 * Granular `business_categories.slug` values stay in the DB for search — this only
 * controls hub / town browse sections.
 */

export const BUSINESS_CATEGORY_GROUP_SLUGS = [
  "restaurants_and_bars",
  "coffee_and_treats",
  "shopping",
  "things_to_do",
  "places_to_stay",
  "beauty_and_wellness",
  "health_and_medical",
  "professional_and_financial",
] as const;

export type BusinessCategoryGroupSlug = (typeof BUSINESS_CATEGORY_GROUP_SLUGS)[number];

export const BUSINESS_CATEGORY_GROUP_LABELS: Record<BusinessCategoryGroupSlug, string> = {
  restaurants_and_bars: "Restaurants & bars",
  coffee_and_treats: "Coffee & treats",
  shopping: "Shopping",
  things_to_do: "Things to do",
  places_to_stay: "Places to stay",
  beauty_and_wellness: "Beauty & wellness",
  health_and_medical: "Health & medical",
  professional_and_financial: "Professional & financial",
};

/** Material icon per browse group (CollapsibleBrowseSection). */
export const BUSINESS_CATEGORY_GROUP_ICONS: Record<BusinessCategoryGroupSlug, string> = {
  restaurants_and_bars: "restaurant",
  coffee_and_treats: "coffee",
  shopping: "shopping_bag",
  things_to_do: "kayaking",
  places_to_stay: "bed",
  beauty_and_wellness: "spa",
  health_and_medical: "medical_services",
  professional_and_financial: "account_balance",
};

/** DB `business_categories.slug` → browse group. Omitted slugs are search-only (not in storefront browse). */
export const BUSINESS_CATEGORY_GROUP_MEMBERS: Record<
  BusinessCategoryGroupSlug,
  readonly string[]
> = {
  restaurants_and_bars: ["restaurants", "bars"],
  coffee_and_treats: [
    "coffee_shops",
    "ice_cream",
    "desserts",
    "donut_shops",
    "candy_sweets",
  ],
  shopping: ["shopping", "boutiques", "specialty_retail", "jewelry", "footwear"],
  things_to_do: ["activities", "entertainment"],
  places_to_stay: ["hotels"],
  beauty_and_wellness: [
    "beauty_wellness",
    "spas",
    "hair_salons",
    "nail_salons",
    "fitness",
  ],
  health_and_medical: [
    "medical_clinics",
    "dental_orthodontics",
    "health_medical",
    "mental_health_counseling",
    "hospice_rehab",
    "chiropractic_wellness",
    "dermatology_skin",
  ],
  professional_and_financial: [
    "financial_accounting",
    "insurance",
    "banking",
    "real_estate",
    "title_escrow",
    "legal_services",
    "photography",
    "professional_services",
  ],
};

const SLUG_TO_GROUP = new Map<string, BusinessCategoryGroupSlug>();
for (const groupSlug of BUSINESS_CATEGORY_GROUP_SLUGS) {
  for (const member of BUSINESS_CATEGORY_GROUP_MEMBERS[groupSlug]) {
    SLUG_TO_GROUP.set(member, groupSlug);
  }
}

/** All granular slugs that appear in storefront browse groups. */
export const BROWSE_GROUPED_CATEGORY_SLUGS = new Set(SLUG_TO_GROUP.keys());

export function businessCategoryGroupForSlug(
  categorySlug: string | null | undefined,
): BusinessCategoryGroupSlug | null {
  if (!categorySlug?.trim()) return null;
  return SLUG_TO_GROUP.get(categorySlug.trim().toLowerCase()) ?? null;
}
