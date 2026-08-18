import { describe, expect, it } from "vitest";
import { resolveIntentBrowseSection } from "@/lib/business-categories/group-browse-sections";
import {
  browseSectionBySlug,
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
    expect(unifiedRollupHubPath("food_and_drink")).toBe("/businesses/food-and-drink");
    expect(unifiedRollupFromPublicSegment("food-and-drink")).toBe("food_and_drink");
  });

  it("looks up collapsible sections by slug even when empty", () => {
    expect(browseSectionBySlug("food_and_drink")).toEqual(
      expect.objectContaining({ id: "food_and_drink", title: "Food & Drink" }),
    );
    expect(browseSectionBySlug("restaurants")).toBeNull();
  });
});

describe("resolveIntentBrowseSection", () => {
  it("keeps populated sections and synthesizes empty valid rollups", () => {
    const populated = resolveIntentBrowseSection(
      [
        {
          id: "shopping",
          title: "Shopping",
          slug: "shopping",
          businesses: [
            {
              id: "1",
              name: "Shop",
              slug: "shop",
              hero_image_url: null,
              ai_one_liner: null,
              ai_summary: null,
            },
          ],
          totalCount: 1,
        },
      ],
      "shopping",
    );
    expect(populated?.businesses).toHaveLength(1);

    const empty = resolveIntentBrowseSection([], "food_and_drink");
    expect(empty).toEqual(
      expect.objectContaining({
        slug: "food_and_drink",
        title: "Food & Drink",
        businesses: [],
        totalCount: 0,
      }),
    );
    expect(resolveIntentBrowseSection([], "not-a-section")).toBeNull();
  });
});
