/**
 * Public listing visibility helpers.
 *
 * Policy: `status = published` and `archived_at` null means public and SEO-ready.
 * Do not filter on `is_hidden_from_search` for browse, detail pages, search, or sitemaps.
 * Archive (or draft / pending_review) is the hide path. Soft-hide is legacy CMS noise.
 */

/** Directus `status` — consumer URLs, browse, search, and sitemap only expose these rows. */
export const DIRECTUS_PUBLISHED_STATUS = "published" as const;

/** Entity tables where published + not archived is enough for public/SEO visibility. */
export const PUBLISHED_MEANS_INDEXABLE_TABLES = [
  "towns",
  "areas",
  "guides",
  "businesses",
  "events",
  "points_of_interest",
] as const;

type EqFilterQuery = { eq: (column: string, value: unknown) => unknown };
type OrFilterQuery = EqFilterQuery & { or: (filters: string) => unknown };

/** Featured pools: row has a Directus asset or cron-synced public URL. */
export const FEATURED_HAS_IMAGE_OR =
  "main_image.not.is.null,hero_image.not.is.null,main_image_url.not.is.null,hero_image_url.not.is.null" as const;

export type ListingImageFields = {
  main_image?: string | null;
  hero_image?: string | null;
  main_image_url?: string | null;
  hero_image_url?: string | null;
};

export function hasListingImage(row: ListingImageFields): boolean {
  return !!(
    row.main_image?.trim() ||
    row.hero_image?.trim() ||
    row.main_image_url?.trim() ||
    row.hero_image_url?.trim()
  );
}

/** Featured masonry and town/area category previews — storefronts only, not regional services. */
export function applyFeaturedStorefrontOnlyFilter<Q extends EqFilterQuery>(query: Q): Q {
  return query.eq("is_service_business", false) as Q;
}

/** Featured pools — only listings with hero or main image. */
export function applyFeaturedHasImageFilter<Q extends EqFilterQuery>(query: Q): Q {
  return (query as unknown as OrFilterQuery).or(FEATURED_HAS_IMAGE_OR) as Q;
}

/** Storefront + has image — home featured, businesses hub, town/area category previews. */
export function applyFeaturedListingPoolFilters<Q extends EqFilterQuery>(query: Q): Q {
  return applyFeaturedHasImageFilter(applyFeaturedStorefrontOnlyFilter(query));
}

export function filterFeaturedListingPool<T extends ListingImageFields>(rows: T[]): T[] {
  return rows.filter(hasListingImage);
}
