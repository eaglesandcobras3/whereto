/**
 * Canonical `business_categories.slug` values and common aliases (LLM / URL / legacy).
 */
export const BUSINESS_CATEGORY_SLUGS = [
  "restaurants",
  "coffee_shops",
  "bars",
  "shopping",
  "activities",
  "services",
] as const;

/** Map informal slugs to rows in `business_categories`. */
const CATEGORY_SLUG_ALIASES: Record<string, (typeof BUSINESS_CATEGORY_SLUGS)[number]> = {
  coffee: "coffee_shops",
  cafe: "coffee_shops",
  cafes: "coffee_shops",
  "coffee-shop": "coffee_shops",
  "coffee-shops": "coffee_shops",
  coffee_shop: "coffee_shops",
  restaurant: "restaurants",
  bar: "bars",
  shop: "shopping",
  shops: "shopping",
  activity: "activities",
  service: "services",
};

/**
 * Normalize a category slug for DB lookup and search constraints.
 * Returns null for empty input.
 */
export function normalizeBusinessCategorySlug(
  slug: string | null | undefined,
): string | null {
  if (!slug?.trim()) return null;
  const key = slug.trim().toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  const aliased = CATEGORY_SLUG_ALIASES[key];
  if (aliased) return aliased;
  if ((BUSINESS_CATEGORY_SLUGS as readonly string[]).includes(key)) return key;
  return key;
}
