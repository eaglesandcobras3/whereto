/**
 * Single-segment paths that must not be handled as town/region slugs.
 * Keep in sync with `app/` static routes.
 */
export const RESERVED_ROOT_SLUGS = new Set([
  "api",
  "admin",
  "login",
  "saved",
  "share",
  "auth",
  "business",
  "towns",
  "_next",
  "favicon.ico",
  "list-your-business",
]);

export function isReservedRootSlug(slug: string): boolean {
  return RESERVED_ROOT_SLUGS.has(slug.toLowerCase());
}
