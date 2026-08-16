/**
 * Retired rollup URLs that no longer have enough inventory for a dedicated
 * `/businesses/[rollup]` page. Send them straight to the active directory,
 * rather than redirecting to a canonical-looking URL that returns 404.
 */
export const LEGACY_CATEGORY_REDIRECTS: ReadonlyArray<{
  source: string;
  destination: string;
}> = [
  { source: "/automotive", destination: "/businesses" },
  { source: "/marine", destination: "/businesses" },
  { source: "/family-and-education", destination: "/businesses" },
  { source: "/categories/automotive", destination: "/businesses" },
  { source: "/categories/marine", destination: "/businesses" },
  { source: "/categories/family-and-education", destination: "/businesses" },
];
