/**
 * PostgREST `or` string: **visible** in browse. Do **not** use `not(is_hidden,eq,true)`:
 * in PostgreSQL, `NOT (null = true)` is unknown, so rows with `null` (meaning “not hidden” in
 * the CMS) were incorrectly excluded and lists showed **zero** rows.
 */
export const BROWSE_VISIBLE_NOT_HIDDEN = "is_hidden_from_search.is.null,is_hidden_from_search.eq.false" as const;

/**
 * Browse / search: which `status` values to include.
 * - Directus: use **`published`** (or **`active`** if you mirror a legacy value).
 * - In **development** we also list **`draft`** so local CMS data is visible before publish.
 * - In production, set `NEXT_PUBLIC_INCLUDE_DRAFT_CONTENT=1` to include draft (e.g. staging only).
 */
export function storefrontListingStatuses(): string[] {
  const base = ["published", "active"];
  const withDraft = [...base, "draft"];
  if (process.env.NEXT_PUBLIC_INCLUDE_DRAFT_CONTENT === "1") {
    return withDraft;
  }
  if (process.env.NODE_ENV === "development") {
    return withDraft;
  }
  return base;
}
