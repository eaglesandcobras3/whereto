import { describe, expect, it } from "vitest";
import {
  businessListingTitleSegment,
  metaDescriptionSnippet,
  preferTitleWithinBudget,
  seoTitleSegmentForLayout,
  townTitleSegment,
  SEO_TITLE_MAX_SEGMENT,
} from "@/lib/seo/metadata-snippets";

describe("seoTitleSegmentForLayout", () => {
  it("strips duplicate brand and fits long CMS titles without ellipsis", () => {
    const long =
      "Seaside Florida Travel Guide: Where to Stay, Eat, Beach and Explore on 30A | WhereTo30A";
    const segment = seoTitleSegmentForLayout(long);
    expect(segment).not.toMatch(/\|\s*WhereTo30A\s*$/i);
    expect(segment).not.toContain("…");
    expect(`${segment} | WhereTo30A`.length).toBeLessThanOrEqual(60);
  });
});

describe("preferTitleWithinBudget", () => {
  it("keeps a fitting preferred title", () => {
    expect(preferTitleWithinBudget("Seaside Travel Guide", "Fallback")).toBe(
      "Seaside Travel Guide",
    );
  });

  it("uses fallback when preferred would truncate", () => {
    const preferred =
      "Rosemary Beach Florida: Where to Stay, Eat, Beach and Explore on 30A";
    const fallback = townTitleSegment("Rosemary Beach");
    const segment = preferTitleWithinBudget(preferred, fallback);
    expect(segment).toBe(fallback);
    expect(segment).not.toContain("…");
    expect(segment.length).toBeLessThanOrEqual(SEO_TITLE_MAX_SEGMENT);
  });
});

describe("townTitleSegment", () => {
  it("fits short and long town names in the layout budget", () => {
    for (const name of ["Seaside", "Rosemary Beach", "Blue Mountain Beach"]) {
      const segment = townTitleSegment(name);
      expect(segment).not.toContain("…");
      expect(segment.length).toBeLessThanOrEqual(SEO_TITLE_MAX_SEGMENT);
      expect(`${segment} | WhereTo30A`.length).toBeLessThanOrEqual(60);
    }
  });
});

describe("metaDescriptionSnippet", () => {
  it("extends short descriptions and truncates long ones", () => {
    const short = metaDescriptionSnippet("Coffee in Seaside.", "Fallback.");
    expect(short.length).toBeGreaterThanOrEqual(70);
    expect(short.length).toBeLessThanOrEqual(155);

    const long = metaDescriptionSnippet("x".repeat(200), "Fallback.");
    expect(long.length).toBeLessThanOrEqual(155);
    expect(long.endsWith("…")).toBe(true);
  });
});

describe("businessListingTitleSegment", () => {
  it("fits name and category in layout title budget", () => {
    const segment = businessListingTitleSegment(
      "Adam Long, Florida Farm Bureau Insurance Santa Rosa Beach",
      ["Services in Santa Rosa Beach"],
    );
    expect(segment).not.toContain("…");
    expect(`${segment} | WhereTo30A`.length).toBeLessThanOrEqual(60);
  });
});
