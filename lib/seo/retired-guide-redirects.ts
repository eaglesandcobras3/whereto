/**
 * Permanent 301 targets for retired `/guide/[slug]` URLs still indexed in search.
 * Pillar slugs consolidate overlapping beach-access and family-travel intents.
 */
export const BEACH_ACCESS_PILLAR_GUIDE_SLUG = "public-beaches-30a" as const;

export const BEACH_ACCESS_PILLAR_GUIDE_PATH =
  `/guide/${BEACH_ACCESS_PILLAR_GUIDE_SLUG}` as const;

/** Retired slug → canonical replacement path (301). */
export const RETIRED_GUIDE_REDIRECTS: Readonly<Record<string, string>> = {
  // Beach access cluster — one pillar page
  "30a-public-beach-access-map-find-the-best-spots-to-hit-the-sand":
    BEACH_ACCESS_PILLAR_GUIDE_PATH,
  "30a-public-beach-access-with-parking": BEACH_ACCESS_PILLAR_GUIDE_PATH,
  "30a-beach-access-map-find-every-entry-point-along-scenic-highway-30a":
    BEACH_ACCESS_PILLAR_GUIDE_PATH,
  "30a-beach-access-find-your-way-to-the-sand": BEACH_ACCESS_PILLAR_GUIDE_PATH,
  "30a-beach-access": BEACH_ACCESS_PILLAR_GUIDE_PATH,
  // Family travel — towns hub owns head-term comparison intent
  "best-30a-towns-for-families": "/towns",
  "things-to-do-with-kids-on-30a": "/guide/family-friendly-30a-beach-vacation",
  // GSC-reported retired guides — preserve the closest available reader intent.
  "seaside-florida-girls-trip-guide": "/guide/25-fun-things-to-do-on-a-girls-trip-to-30a",
  watercolor: "/town/watercolor",
  "grayton-beach-permit": BEACH_ACCESS_PILLAR_GUIDE_PATH,
  "where-to-stay-on-30a": "/towns",
};

/** Next.js redirect rules derived from {@link RETIRED_GUIDE_REDIRECTS}. */
export function retiredGuideRedirectRules(): Array<{
  source: string;
  destination: string;
  permanent: true;
}> {
  return Object.entries(RETIRED_GUIDE_REDIRECTS).map(([slug, destination]) => ({
    source: `/guide/${slug}`,
    destination,
    permanent: true as const,
  }));
}
