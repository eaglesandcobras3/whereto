/**
 * PostgREST `or` string: **visible** in browse for **business listings** (and similar
 * inventory such as events / POIs that still support soft-hide).
 *
 * Do **not** apply this to towns, areas, or guides. For those editorial entities,
 * `status = published` and `archived_at` null means public and SEO-ready — ignore
 * `is_hidden_from_search`.
 *
 * Do **not** use `not(is_hidden,eq,true)`: in PostgreSQL, `NOT (null = true)` is unknown,
 * so rows with `null` (meaning “not hidden” in the CMS) were incorrectly excluded and
 * lists showed **zero** rows.
 */
export const BROWSE_VISIBLE_NOT_HIDDEN =
  "is_hidden_from_search.is.null,is_hidden_from_search.eq.false" as const;

/** Directus `status` — consumer URLs, browse, search, and sitemap only expose these rows. */
export const DIRECTUS_PUBLISHED_STATUS = "published" as const;

/** Tables where published + not archived is enough for public/SEO visibility. */
export const PUBLISHED_MEANS_INDEXABLE_TABLES = ["towns", "areas", "guides"] as const;

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
export function applyFeaturedHasImageFilter<Q extends OrFilterQuery>(query: Q): Q {
  return query.or(FEATURED_HAS_IMAGE_OR) as Q;
}

/** Storefront + has image — home featured, businesses hub, town/area category previews. */
export function applyFeaturedListingPoolFilters<Q extends OrFilterQuery>(query: Q): Q {
  return applyFeaturedHasImageFilter(applyFeaturedStorefrontOnlyFilter(query));
}

export function filterFeaturedListingPool<T extends ListingImageFields>(rows: T[]): T[] {
  return rows.filter(hasListingImage);
}
