/**
 * Retired / malformed area slugs still reported in Search Console.
 * Prefer the closest live place or town page over the generic /areas hub.
 */
export const LEGACY_AREA_REDIRECTS: ReadonlyArray<{
  source: string;
  destination: string;
}> = [
  {
    source: "/area/gulf-place-town-center-guide",
    destination: "/town/gulf-place",
  },
];
