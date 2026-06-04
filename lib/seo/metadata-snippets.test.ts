import { describe, expect, it } from "vitest";
import {
  businessListingTitleSegment,
  metaDescriptionSnippet,
  seoTitleSegmentForLayout,
} from "@/lib/seo/metadata-snippets";

describe("seoTitleSegmentForLayout", () => {
  it("strips duplicate brand and truncates long CMS titles", () => {
    const long =
      "Seaside Florida Travel Guide: Where to Stay, Eat, Beach and Explore on 30A | WhereTo30A";
    const segment = seoTitleSegmentForLayout(long);
    expect(segment).not.toMatch(/\|\s*WhereTo30A\s*$/i);
    expect(`${segment} | WhereTo30A`.length).toBeLessThanOrEqual(60);
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
    expect(`${segment} | WhereTo30A`.length).toBeLessThanOrEqual(60);
  });
});
