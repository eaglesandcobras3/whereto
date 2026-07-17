import { describe, expect, it } from "vitest";
import {
  browseSectionForCategorySlug,
  unifiedRollupFromPublicSegment,
  unifiedRollupHubPath,
} from "@/lib/categories/unified-browse";

describe("unified-browse", () => {
  it("maps remapped storefront slugs to CSV rollups", () => {
    expect(browseSectionForCategorySlug("restaurants")).toEqual(
      expect.objectContaining({ id: "food_and_drink", title: "Food & Drink" }),
    );
    expect(browseSectionForCategorySlug("hvac_plumbing")).toEqual(
      expect.objectContaining({ id: "home_services", title: "Home Services" }),
    );
  });

  it("resolves rollup hub paths", () => {
    expect(unifiedRollupHubPath("food_and_drink")).toBe("/categories/food-and-drink");
    expect(unifiedRollupFromPublicSegment("food-and-drink")).toBe("food_and_drink");
  });
});
