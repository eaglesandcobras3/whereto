/**
 * PostgREST `or` string: **visible** in browse. Do **not** use `not(is_hidden,eq,true)`:
 * in PostgreSQL, `NOT (null = true)` is unknown, so rows with `null` (meaning “not hidden” in
 * the CMS) were incorrectly excluded and lists showed **zero** rows.
 */
export const BROWSE_VISIBLE_NOT_HIDDEN =
  "is_hidden_from_search.is.null,is_hidden_from_search.eq.false" as const;

/** Directus `status` — consumer URLs, browse, search, and sitemap only expose these rows. */
export const DIRECTUS_PUBLISHED_STATUS = "published" as const;
