import type { Metadata } from "next";

/**
 * Relative canonical URL for `generateMetadata` / page `metadata`.
 * Requires root `layout` `metadataBase` (see `app/layout.tsx`) so crawlers resolve an absolute `<link rel="canonical">`.
 */
export function canonicalAlternates(pathnameAndQuery: string): Pick<Metadata, "alternates"> {
  const p = pathnameAndQuery.startsWith("/") ? pathnameAndQuery : `/${pathnameAndQuery}`;
  return { alternates: { canonical: p } };
}
