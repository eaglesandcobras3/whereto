/** Tags that describe food/products — search spans restaurants and markets, not one category. */
export const CUISINE_PRODUCT_TAGS = new Set([
  "seafood",
  "sushi",
  "pizza",
  "mexican",
  "bbq",
  "burgers",
  "steak",
  "italian",
  "breakfast",
  "brunch",
  "lunch",
  "dinner",
]);

export function isCuisineProductTag(slug: string): boolean {
  return CUISINE_PRODUCT_TAGS.has(slug);
}

export function hasCuisineProductTags(tags: string[]): boolean {
  return tags.some(isCuisineProductTag);
}

/** Storefront browse groups preferred when cuisine/product tags are active. */
export const CUISINE_PREFERRED_STOREFRONT_GROUPS = [
  "restaurants_and_bars",
  "shopping",
] as const;
