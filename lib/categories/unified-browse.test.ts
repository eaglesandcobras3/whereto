import { describe, expect, it } from "vitest";
import {
  groupBusinessesIntoLeafSections,
  isTownIntentCategorySlug,
  normalizeIntentSlug,
  resolveIntentBrowseSection,
  resolveTownIntentSection,
} from "@/lib/business-categories/group-browse-sections";
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

describe("town leaf intents", () => {
  it("normalizes hyphenated intent segments", () => {
    expect(normalizeIntentSlug("food-and-drink")).toBe("food_and_drink");
    expect(normalizeIntentSlug("coffee-shops")).toBe("coffee_shops");
  });

  it("groups businesses into populated leaf sections only", () => {
    const sections = groupBusinessesIntoLeafSections([
      {
        id: "1",
        name: "Cafe",
        slug: "cafe",
        hero_image_url: null,
        ai_one_liner: null,
        ai_summary: null,
        categorySlug: "coffee_shops",
        categoryTitle: "Coffee Shops",
      },
      {
        id: "2",
        name: "Bistro",
        slug: "bistro",
        hero_image_url: null,
        ai_one_liner: null,
        ai_summary: null,
        categorySlug: "restaurants",
        categoryTitle: "Restaurants",
      },
    ]);
    expect(sections.map((s) => s.slug).sort()).toEqual(["coffee_shops", "restaurants"]);
    expect(sections.find((s) => s.slug === "restaurants")?.totalCount).toBe(1);
  });

  it("resolves populated leaf intents and 404s empty leaves", () => {
    const leafSections = groupBusinessesIntoLeafSections([
      {
        id: "1",
        name: "Cafe",
        slug: "cafe",
        hero_image_url: null,
        ai_one_liner: null,
        ai_summary: null,
        categorySlug: "coffee_shops",
        categoryTitle: "Coffee Shops",
      },
    ]);
    expect(resolveTownIntentSection([], leafSections, "coffee-shops")?.slug).toBe(
      "coffee_shops",
    );
    expect(resolveTownIntentSection([], leafSections, "restaurants")).toBeNull();
  });

  it("prefers rollup resolution over leaf when the slug is a rollup", () => {
    const rollup = resolveTownIntentSection([], [], "food_and_drink");
    expect(rollup).toEqual(
      expect.objectContaining({ slug: "food_and_drink", businesses: [] }),
    );
  });

  it("marks rollup and leaf hub slugs as town-intent linkable", () => {
    expect(isTownIntentCategorySlug("food_and_drink")).toBe(true);
    expect(isTownIntentCategorySlug("restaurants")).toBe(true);
    expect(isTownIntentCategorySlug("coffee-shops")).toBe(true);
  });
});
