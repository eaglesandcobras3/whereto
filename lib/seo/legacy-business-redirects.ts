/**
 * Retired business slugs whose listings remain available under canonical URLs.
 * Redirect only when the destination is the same business, not a generic hub.
 */
export const LEGACY_BUSINESS_REDIRECTS: ReadonlyArray<{
  source: string;
  destination: string;
}> = [
  {
    source: "/business/havana-beach-bar-grill-rosemary-beach",
    destination: "/business/havana-beach-bar-and-grill",
  },
  {
    source: "/business/taco-bar-bud-alleys-seaside-fl",
    destination: "/business/bud-and-alleys-waterfront-restaurant",
  },
  {
    source: "/business/artful-eye-seaside-fl",
    destination: "/business/artful-eye",
  },
  {
    source: "/business/the-shrimp-shack-seaside-fl",
    destination: "/business/shrimp-shack",
  },
  {
    source: "/business/the-art-of-simple-seaside-fl",
    destination: "/business/art-of-simple",
  },
  {
    source: "/business/cowgirl-kitchen-rosemary-beach",
    destination: "/business/cowgirl-kitchen",
  },
  // Listing removed; closest place page is Alys Beach Town Center.
  {
    source: "/business/holiday-shop",
    destination: "/area/alys-beach-town-center",
  },
];
