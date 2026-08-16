/**
 * Legacy storefront browse-group URLs that overlap unified rollups.
 * Shared segments (shopping, things-to-do, etc.) already resolve to unified
 * first and do not need redirects.
 */
export const LEGACY_BROWSE_GROUP_REDIRECTS: ReadonlyArray<{
  source: string;
  destination: string;
}> = [
  {
    source: "/businesses/restaurants-and-bars",
    destination: "/businesses/food-and-drink",
  },
  {
    source: "/businesses/coffee-and-treats",
    destination: "/businesses/food-and-drink",
  },
  {
    source: "/businesses/health-and-medical",
    destination: "/businesses/medical",
  },
  {
    source: "/businesses/professional-and-financial",
    destination: "/businesses/professional",
  },
];

export function legacyBrowseGroupRedirectDestination(
  pathname: string,
): string | null {
  const normalized = pathname.replace(/\/$/, "") || "/";
  const hit = LEGACY_BROWSE_GROUP_REDIRECTS.find((r) => r.source === normalized);
  return hit?.destination ?? null;
}
