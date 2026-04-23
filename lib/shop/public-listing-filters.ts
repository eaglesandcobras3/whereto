/**
 * Browse / search: which `status` values to include.
 * - Directus: publish items to **`published`** (or **`active`** if you mirror a legacy value).
 * - For local testing with unpublished rows, set `NEXT_PUBLIC_INCLUDE_DRAFT_CONTENT=1` to also
 *   include `draft` (dev/staging only — do not set in public production without understanding SEO).
 */
export function storefrontListingStatuses(): string[] {
  const base = ["published", "active"];
  if (process.env.NEXT_PUBLIC_INCLUDE_DRAFT_CONTENT === "1") {
    return [...base, "draft"];
  }
  return base;
}
