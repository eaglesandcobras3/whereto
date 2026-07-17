/**
 * Single-segment paths that must not be handled as town/region slugs.
 * Keep in sync with `app/` static routes.
 */
export const RESERVED_ROOT_SLUGS = new Set([
  "_next",
  "about",
  "admin",
  "api",
  "area",
  "areas",
  "auth",
  "business",
  "businesses",
  "categories",
  "dev",
  "events",
  "favicon.ico",
  "feedback",
  "forgot-password",
  "guide",
  "guides",
  "list-your-business",
  "login",
  "privacy",
  "profile",
  "reset-password",
  "saved",
  "search",
  "services",
  "sitemap.xml",
  "llms.txt",
  "robots.txt",
  "share",
  "signup",
  "terms",
  "town",
  "towns",
  "verify",
]);

export function isReservedRootSlug(slug: string): boolean {
  return RESERVED_ROOT_SLUGS.has(slug.toLowerCase());
}
