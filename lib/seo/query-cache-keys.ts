/**
 * Canonical `query_cache.query_key` values for Phase 2 precompute ↔ town hub ↔ SEO.
 * Must stay stable so crons and pages agree.
 */

export function categoryTownKey(categorySlug: string, townSlug: string): string {
  return `category_${categorySlug}|town_${townSlug}`;
}

/** Intent-scoped rows (same category + attribute filters). */
export function intentTownKey(intentSlug: string, townSlug: string): string {
  return `intent_${intentSlug}|town_${townSlug}`;
}

export type PrecomputeTemplate = {
  queryKey: (townSlug: string) => string;
  categorySlug: string;
  attributes: string[];
  /** Path segment under town for `seo_pages.slug` (e.g. coffee → seaside/coffee). */
  seoSlug: string;
  /** Human town name injected into AI raw query. */
  rawQuery: (townName: string) => string;
  /** SEO / page title when publishing. */
  seoTitle: (townName: string) => string;
};

/** Mirrors `getTownHubExpandedSections` + core browse intents. */
export const TOWN_PRECOMPUTE_TEMPLATES: PrecomputeTemplate[] = [
  {
    queryKey: (town) => categoryTownKey("restaurants", town),
    categorySlug: "restaurants",
    attributes: [],
    seoSlug: "restaurants",
    rawQuery: (name) => `best restaurants in ${name}`,
    seoTitle: (name) => `Best restaurants in ${name}`,
  },
  {
    queryKey: (town) => categoryTownKey("coffee_shops", town),
    categorySlug: "coffee_shops",
    attributes: [],
    seoSlug: "coffee",
    rawQuery: (name) => `best coffee in ${name}`,
    seoTitle: (name) => `Best coffee in ${name}`,
  },
  {
    queryKey: (town) => categoryTownKey("activities", town),
    categorySlug: "activities",
    attributes: [],
    seoSlug: "things-to-do",
    rawQuery: (name) => `things to do in ${name}`,
    seoTitle: (name) => `Things to do in ${name}`,
  },
  {
    queryKey: (town) => intentTownKey("lunch", town),
    categorySlug: "restaurants",
    attributes: ["lunch"],
    seoSlug: "lunch",
    rawQuery: (name) => `casual lunch in ${name}`,
    seoTitle: (name) => `Casual lunch in ${name}`,
  },
  {
    queryKey: (town) => intentTownKey("date_night", town),
    categorySlug: "restaurants",
    attributes: ["date_night"],
    seoSlug: "date-night",
    rawQuery: (name) => `date night dinner in ${name}`,
    seoTitle: (name) => `Date night in ${name}`,
  },
  {
    queryKey: (town) => intentTownKey("kid_friendly", town),
    categorySlug: "restaurants",
    attributes: ["kid_friendly"],
    seoSlug: "kid-friendly",
    rawQuery: (name) => `kid-friendly restaurants in ${name}`,
    seoTitle: (name) => `Kid-friendly restaurants in ${name}`,
  },
  {
    queryKey: (town) => intentTownKey("quick_bite", town),
    categorySlug: "restaurants",
    attributes: ["quick_bite"],
    seoSlug: "quick-bites",
    rawQuery: (name) => `quick bites in ${name}`,
    seoTitle: (name) => `Quick bites in ${name}`,
  },
];

/** Map town hub section → query_key factory (same keys as precompute). */
export const townHubSectionKeys = (townSlug: string) =>
  ({
    topPicks: categoryTownKey("restaurants", townSlug),
    coffee: categoryTownKey("coffee_shops", townSlug),
    casualLunch: intentTownKey("lunch", townSlug),
    dateNight: intentTownKey("date_night", townSlug),
    kidFriendly: intentTownKey("kid_friendly", townSlug),
    quickBites: intentTownKey("quick_bite", townSlug),
  }) as const;
