import { describe, expect, it } from "vitest";
import { isCategoryEligibleForSitemap } from "@/lib/seo/sitemap-category-eligibility";

describe("isCategoryEligibleForSitemap", () => {
  it("requires leaf + min listings", () => {
    expect(
      isCategoryEligibleForSitemap({
        slug: "restaurants",
        parent_category_id: "parent-1",
        listing_count: 5,
      }),
    ).toBe(true);
    expect(
      isCategoryEligibleForSitemap({
        slug: "food_and_drink",
        parent_category_id: null,
        listing_count: 50,
      }),
    ).toBe(false);
    expect(
      isCategoryEligibleForSitemap({
        slug: "rare_niche",
        parent_category_id: "parent-1",
        listing_count: 2,
      }),
    ).toBe(false);
    expect(
      isCategoryEligibleForSitemap({
        slug: "",
        parent_category_id: "parent-1",
        listing_count: 10,
      }),
    ).toBe(false);
  });
});
