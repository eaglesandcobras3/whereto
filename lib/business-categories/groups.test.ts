import { describe, expect, it } from "vitest";
import { businessCategoryGroupForSlug } from "./groups";
import { groupBusinessesIntoBrowseSections } from "./group-browse-sections";

describe("businessCategoryGroupForSlug", () => {
  it("maps granular slugs to browse groups", () => {
    expect(businessCategoryGroupForSlug("restaurants")).toBe("restaurants_and_bars");
    expect(businessCategoryGroupForSlug("chiropractic_wellness")).toBe("health_and_medical");
    expect(businessCategoryGroupForSlug("services")).toBeNull();
    expect(businessCategoryGroupForSlug("hvac_plumbing")).toBeNull();
  });
});

describe("groupBusinessesIntoBrowseSections", () => {
  it("merges listings into unified rollups (legacy storefront slugs remap)", () => {
    const sections = groupBusinessesIntoBrowseSections([
      {
        id: "1",
        name: "A",
        slug: "a",
        hero_image_url: null,
        ai_one_liner: null,
        ai_summary: null,
        categorySlug: "restaurants",
      },
      {
        id: "2",
        name: "B",
        slug: "b",
        hero_image_url: null,
        ai_one_liner: null,
        ai_summary: null,
        categorySlug: "bars",
      },
      {
        id: "3",
        name: "C",
        slug: "c",
        hero_image_url: null,
        ai_one_liner: null,
        ai_summary: null,
        categorySlug: "unknown_specialty_xyz",
      },
    ]);

    expect(sections).toHaveLength(1);
    expect(sections[0]?.slug).toBe("food_and_drink");
    expect(sections[0]?.title).toBe("Food & Drink");
    expect(sections[0]?.totalCount).toBe(2);
  });
});
