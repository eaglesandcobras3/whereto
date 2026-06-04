import { normalizeBusinessCategorySlug } from "@/lib/search/category-slugs";

/** DB `business_categories.slug` → public URL segment (no leading slash). */
export const CATEGORY_HUB_PUBLIC_SEGMENT: Record<string, string> = {
  restaurants: "restaurants",
  coffee_shops: "coffee-shops",
  bars: "bars",
  shopping: "shopping",
  activities: "activities",
  /** Storefront category — `/services` is the regional vendor hub. */
  services: "service-businesses",
  events: "events",
  beaches: "beaches",
};

const PUBLIC_SEGMENT_TO_DB_SLUG = Object.fromEntries(
  Object.entries(CATEGORY_HUB_PUBLIC_SEGMENT).map(([db, pub]) => [pub, db]),
) as Record<string, string>;

/** Previous SEO paths before `-on-30a` was removed. */
const LEGACY_ON_30A_SEGMENT: Record<string, string> = {
  "restaurants-on-30a": "restaurants",
  "coffee-shops-on-30a": "coffee-shops",
  "bars-on-30a": "bars",
  "shopping-on-30a": "shopping",
  "activities-on-30a": "activities",
  "services-on-30a": "service-businesses",
  "local-services-on-30a": "service-businesses",
  "events-on-30a": "events",
  "beaches-on-30a": "beaches",
};

export const ALL_CATEGORY_HUB_PUBLIC_SEGMENTS = Object.values(CATEGORY_HUB_PUBLIC_SEGMENT);

function dbSlugToPublicSegment(dbSlug: string): string {
  const key = normalizeBusinessCategorySlug(dbSlug) ?? dbSlug.trim().toLowerCase();
  return CATEGORY_HUB_PUBLIC_SEGMENT[key] ?? key.replace(/_/g, "-");
}

/** Canonical indexable path for a category hub (e.g. `/restaurants`). */
export function categoryHubPath(dbSlug: string): string {
  return `/${dbSlugToPublicSegment(dbSlug)}`;
}

/** Resolve a URL segment to a DB category slug, or null if not a category hub path. */
export function categoryDbSlugFromPublicPath(segment: string): string | null {
  const norm = segment.trim().toLowerCase();
  if (!norm) return null;
  if (PUBLIC_SEGMENT_TO_DB_SLUG[norm]) return PUBLIC_SEGMENT_TO_DB_SLUG[norm];
  return null;
}

/** Map legacy `*-on-30a` segment to DB slug (for redirects only). */
export function categoryDbSlugFromLegacyOn30aSegment(segment: string): string | null {
  const norm = segment.trim().toLowerCase();
  const mapped = LEGACY_ON_30A_SEGMENT[norm];
  if (mapped) {
    return categoryDbSlugFromPublicPath(mapped) ?? normalizeBusinessCategorySlug(mapped);
  }
  if (!norm.endsWith("-on-30a")) return null;
  const stem = norm.slice(0, -"-on-30a".length).replace(/-/g, "_");
  return normalizeBusinessCategorySlug(stem) ?? (stem || null);
}

/** Legacy `/categories/[slug]` path (for redirects only). */
export function legacyCategoryPath(dbSlug: string): string {
  const key = normalizeBusinessCategorySlug(dbSlug) ?? dbSlug.trim().toLowerCase();
  return `/categories/${key}`;
}

export function isCategoryHubPublicPath(pathname: string): boolean {
  const segment = pathname.replace(/^\//, "").split("/")[0]?.toLowerCase() ?? "";
  return categoryDbSlugFromPublicPath(segment) !== null;
}

export function isLegacyCategoryOn30aPath(pathname: string): boolean {
  const segment = pathname.replace(/^\//, "").split("/")[0]?.toLowerCase() ?? "";
  return categoryDbSlugFromLegacyOn30aSegment(segment) !== null;
}
