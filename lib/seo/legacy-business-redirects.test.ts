import { describe, expect, it } from "vitest";
import { LEGACY_BUSINESS_REDIRECTS } from "./legacy-business-redirects";

describe("LEGACY_BUSINESS_REDIRECTS", () => {
  it("maps GSC-reported retired business URLs to the same live listing", () => {
    expect(LEGACY_BUSINESS_REDIRECTS).toEqual(
      expect.arrayContaining([
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
        {
          source: "/business/holiday-shop",
          destination: "/area/alys-beach-town-center",
        },
      ]),
    );
  });

  it("keeps source paths unique", () => {
    const sources = LEGACY_BUSINESS_REDIRECTS.map((r) => r.source);
    expect(new Set(sources).size).toBe(sources.length);
  });
});
