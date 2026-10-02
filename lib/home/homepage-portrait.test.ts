import { describe, expect, it } from "vitest";
import { categoryEyebrowFromEmbed, guideTypeEyebrow } from "@/lib/home/homepage-portrait";

describe("categoryEyebrowFromEmbed", () => {
  it("reads a single category object", () => {
    expect(
      categoryEyebrowFromEmbed({ slug: "restaurants", title: "Restaurants" }),
    ).toBe("Restaurants");
  });

  it("reads the first item of an array embed", () => {
    expect(
      categoryEyebrowFromEmbed([{ slug: "art-galleries", title: "Art Galleries" }]),
    ).toBe("Art Galleries");
  });

  it("returns null when title is missing", () => {
    expect(categoryEyebrowFromEmbed(null)).toBeNull();
    expect(categoryEyebrowFromEmbed({ slug: "restaurants" })).toBeNull();
  });
});

describe("guideTypeEyebrow", () => {
  it("maps known guide types", () => {
    expect(guideTypeEyebrow("editorial")).toBe("Guide");
    expect(guideTypeEyebrow("town")).toBe("Town Guide");
    expect(guideTypeEyebrow("seasonal")).toBe("Seasonal");
    expect(guideTypeEyebrow("intent")).toBe("Planning");
  });

  it("falls back to Guide or a spaced slug", () => {
    expect(guideTypeEyebrow(null)).toBe("Guide");
    expect(guideTypeEyebrow("first_timer")).toBe("first timer");
  });
});
