import { describe, expect, it } from "vitest";
import {
  assignTagsFromListingText,
  matchSuggestedTagsToVocab,
} from "./assign-tags-from-text";

describe("matchSuggestedTagsToVocab", () => {
  it("maps freeform phrases onto canonical tags", () => {
    expect(
      matchSuggestedTagsToVocab([
        "Family Friendly",
        "homemade ice cream",
        "not_a_real_thing",
        "date night",
      ]),
    ).toEqual(["family_friendly", "ice_cream", "date_night"]);
  });
});

describe("assignTagsFromListingText", () => {
  it("prefers matched suggestions then fills from copy keywords", () => {
    const tags = assignTagsFromListingText({
      title: "Blue Mountain Beach Creamery",
      category: "Ice cream",
      excerpt: "Homemade ice cream and waffle cones by the beach.",
      overview: "Family-friendly scoop shop with outdoor seating near Blue Mountain Beach.",
      suggested_tags: ["ice cream", "family friendly", "dessert shop", "beach treats"],
    });
    expect(tags).toContain("ice_cream");
    expect(tags).toContain("family_friendly");
    expect(tags[0]).toBe("ice_cream");
    expect(tags.length).toBeGreaterThan(0);
    expect(tags.length).toBeLessThanOrEqual(8);
  });

  it("returns empty when there is no text or suggestions", () => {
    expect(assignTagsFromListingText({})).toEqual([]);
  });

  it("does not treat fitness apparel as a fitness class", () => {
    const tags = assignTagsFromListingText({
      title: "Lululemon Grand Boulevard",
      category: "Apparel",
      excerpt: "Technical athletic wear, yoga apparel, and workout essentials.",
      suggested_tags: ["yoga apparel", "workout clothes", "shopping"],
    });

    expect(tags).toContain("apparel");
    expect(tags).not.toContain("fitness_classes");
    expect(tags).not.toContain("yoga");
  });

  it("does not treat resort wear as travel services", () => {
    const tags = assignTagsFromListingText({
      title: "J.Jill",
      category: "Boutiques & Apparel",
      excerpt: "Relaxed women's clothing and resort wear for coastal days.",
      suggested_tags: ["resort wear", "women's clothing", "accessories"],
    });

    expect(tags).toContain("apparel");
    expect(tags).not.toContain("travel_services");
  });

  it("does not give restaurants retail tags from incidental copy", () => {
    const tags = assignTagsFromListingText({
      title: "A Coastal Restaurant",
      category: "Restaurants",
      excerpt: "Dinner near galleries and jewelry boutiques, with fresh seafood.",
      suggested_tags: ["jewelry", "art", "seafood"],
    });

    expect(tags).toContain("seafood");
    expect(tags).not.toContain("jewelry");
    expect(tags).not.toContain("art");
  });

  it("does not let a home-service mention assign a different trade", () => {
    const tags = assignTagsFromListingText({
      title: "A Plumbing Company",
      category: "Plumbing",
      excerpt: "Plumbing repairs and clean, reliable service for coastal homes.",
      suggested_tags: ["plumbing", "cleaning", "home maintenance"],
    });

    expect(tags).toContain("plumbing");
    expect(tags).not.toContain("cleaning_services");
    expect(tags).not.toContain("handyman");
  });
});
