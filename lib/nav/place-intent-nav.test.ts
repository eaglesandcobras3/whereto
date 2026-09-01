import { describe, expect, it } from "vitest";
import {
  placeIntentNavHref,
  placeIntentNavHrefForLevel,
  resolvePlaceIntentNavFromIntentSlug,
} from "@/lib/nav/place-intent-nav";

describe("resolvePlaceIntentNavFromIntentSlug", () => {
  it("maps rollup intents to category only", () => {
    expect(resolvePlaceIntentNavFromIntentSlug("food_and_drink")).toEqual({
      categorySlug: "food_and_drink",
      subcategorySlug: null,
    });
  });

  it("maps leaf intents to category + subcategory", () => {
    expect(resolvePlaceIntentNavFromIntentSlug("restaurants")).toEqual({
      categorySlug: "food_and_drink",
      subcategorySlug: "restaurants",
    });
  });
});

describe("placeIntentNavHref", () => {
  it("returns hub path when no place is selected", () => {
    expect(placeIntentNavHref("town", {})).toBe("/towns");
    expect(placeIntentNavHref("area", {})).toBe("/areas");
  });

  it("returns place detail when only place is selected", () => {
    expect(placeIntentNavHref("town", { placeSlug: "seaside" })).toBe("/town/seaside");
    expect(placeIntentNavHref("area", { placeSlug: "rosemary_beach" })).toBe(
      "/area/rosemary_beach",
    );
  });

  it("returns intent paths for category and subcategory", () => {
    expect(
      placeIntentNavHref("town", {
        placeSlug: "seaside",
        categorySlug: "food_and_drink",
      }),
    ).toBe("/town/seaside/food_and_drink");
    expect(
      placeIntentNavHref("town", {
        placeSlug: "seaside",
        categorySlug: "food_and_drink",
        subcategorySlug: "restaurants",
      }),
    ).toBe("/town/seaside/restaurants");
  });
});

describe("placeIntentNavHrefForLevel", () => {
  it("clears deeper crumbs when jumping to a level", () => {
    const selection = {
      placeSlug: "seaside",
      categorySlug: "food_and_drink",
      subcategorySlug: "restaurants",
    };
    expect(placeIntentNavHrefForLevel("town", selection, "hub")).toBe("/towns");
    expect(placeIntentNavHrefForLevel("town", selection, "place")).toBe("/town/seaside");
    expect(placeIntentNavHrefForLevel("town", selection, "category")).toBe(
      "/town/seaside/food_and_drink",
    );
    expect(placeIntentNavHrefForLevel("town", selection, "subcategory")).toBe(
      "/town/seaside/restaurants",
    );
  });
});
