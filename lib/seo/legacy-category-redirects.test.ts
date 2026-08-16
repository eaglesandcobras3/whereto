import { describe, expect, it } from "vitest";
import { LEGACY_CATEGORY_REDIRECTS } from "./legacy-category-redirects";

describe("LEGACY_CATEGORY_REDIRECTS", () => {
  it("prevents GSC-reported retired rollups from redirecting to 404s", () => {
    expect(LEGACY_CATEGORY_REDIRECTS).toEqual(
      expect.arrayContaining([
        { source: "/automotive", destination: "/businesses" },
        { source: "/marine", destination: "/businesses" },
        { source: "/family-and-education", destination: "/businesses" },
        { source: "/categories/automotive", destination: "/businesses" },
        { source: "/categories/marine", destination: "/businesses" },
        {
          source: "/categories/family-and-education",
          destination: "/businesses",
        },
      ]),
    );
  });

  it("keeps source paths unique", () => {
    const sources = LEGACY_CATEGORY_REDIRECTS.map((r) => r.source);
    expect(new Set(sources).size).toBe(sources.length);
  });
});
