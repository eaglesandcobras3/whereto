import { describe, expect, it } from "vitest";
import { scoreDiscoverListing } from "./score-listing";

const baseRow = {
  is_storefront: true,
  is_service_business: false,
  search_tags: ["gluten_free", "coffee"],
  business_categories: { slug: "coffee_shops" },
  service_categories: null,
};

function state(overrides: Partial<Parameters<typeof scoreDiscoverListing>[1]> = {}) {
  return {
    entity_type: "storefront" as const,
    town_ids: [],
    anchor_town_ids: [],
    tags: [],
    page: 1,
    page_size: 24,
    ...overrides,
  };
}

describe("scoreDiscoverListing", () => {
  it("requires tag match when tags are selected", () => {
    const match = scoreDiscoverListing(baseRow, state({ tags: ["gluten_free"] }), "shopping", undefined);
    const miss = scoreDiscoverListing(
      { ...baseRow, search_tags: ["kids"] },
      state({ tags: ["gluten_free"] }),
      "shopping",
      undefined,
    );
    expect(match.passes).toBe(true);
    expect(miss.passes).toBe(false);
  });

  it("soft-ranks category and entity type when tags are selected", () => {
    const inScope = scoreDiscoverListing(
      baseRow,
      state({ tags: ["gluten_free"], category_slug: "coffee_and_treats" }),
      "coffee_and_treats",
      undefined,
    );
    const otherCategory = scoreDiscoverListing(
      { ...baseRow, business_categories: { slug: "boutiques" } },
      state({ tags: ["gluten_free"], category_slug: "coffee_and_treats" }),
      "coffee_and_treats",
      undefined,
    );
    const service = scoreDiscoverListing(
      {
        ...baseRow,
        is_storefront: false,
        is_service_business: true,
        service_categories: { slug: "plumbing" },
        business_categories: null,
      },
      state({ tags: ["gluten_free"], category_slug: "coffee_and_treats" }),
      "coffee_and_treats",
      undefined,
    );

    expect(inScope.passes).toBe(true);
    expect(otherCategory.passes).toBe(true);
    expect(service.passes).toBe(true);
    expect(inScope.score).toBeGreaterThan(otherCategory.score);
    expect(otherCategory.score).toBeGreaterThan(service.score);
    expect(inScope.scope_match.category_match).toBe(true);
    expect(otherCategory.scope_match.category_match).toBe(false);
    expect(service.scope_match.entity_type_match).toBe(false);
  });

  it("hard-filters category and entity type when no tags are selected", () => {
    const match = scoreDiscoverListing(
      baseRow,
      state({ category_slug: "coffee_and_treats" }),
      "coffee_and_treats",
      undefined,
    );
    const wrongCategory = scoreDiscoverListing(
      { ...baseRow, business_categories: { slug: "boutiques" } },
      state({ category_slug: "coffee_and_treats" }),
      "coffee_and_treats",
      undefined,
    );
    const wrongType = scoreDiscoverListing(
      {
        ...baseRow,
        is_storefront: false,
        is_service_business: true,
        service_categories: { slug: "plumbing" },
        business_categories: null,
      },
      state({ category_slug: "coffee_and_treats" }),
      "coffee_and_treats",
      undefined,
    );

    expect(match.passes).toBe(true);
    expect(wrongCategory.passes).toBe(false);
    expect(wrongType.passes).toBe(false);
  });

  it("prioritizes anchor town listings in near searches", () => {
    const anchorTownId = "00000000-0000-4000-8000-0000000000aa";
    const otherTownId = "00000000-0000-4000-8000-0000000000bb";
    const anchorRow = { ...baseRow, town_id: anchorTownId };
    const nearbyRow = { ...baseRow, town_id: otherTownId, title: "AAA Nearby" };

    const anchorScore = scoreDiscoverListing(
      anchorRow,
      state({ anchor_town_ids: [anchorTownId] }),
      undefined,
      undefined,
    );
    const nearbyScore = scoreDiscoverListing(
      nearbyRow,
      state({ anchor_town_ids: [anchorTownId] }),
      undefined,
      undefined,
    );

    expect(anchorScore.score).toBeGreaterThan(nearbyScore.score);
  });

  it("soft-ranks restaurants and markets for cuisine tags without a category filter", () => {
    const restaurant = {
      ...baseRow,
      business_categories: { slug: "restaurants" },
      search_tags: ["seafood"],
    };
    const market = {
      ...baseRow,
      business_categories: { slug: "specialty_retail" },
      search_tags: ["seafood"],
      title: "Harbor Market",
    };
    const boutique = {
      ...baseRow,
      business_categories: { slug: "boutiques" },
      search_tags: ["seafood"],
      title: "Coastal Boutique",
    };
    const filterState = state({ tags: ["seafood"] });

    const restaurantScore = scoreDiscoverListing(restaurant, filterState, undefined, undefined);
    const marketScore = scoreDiscoverListing(market, filterState, undefined, undefined);
    const boutiqueScore = scoreDiscoverListing(boutique, filterState, undefined, undefined);

    expect(restaurantScore.passes).toBe(true);
    expect(marketScore.passes).toBe(true);
    expect(restaurantScore.score).toBeGreaterThan(boutiqueScore.score);
    expect(marketScore.score).toBeGreaterThan(boutiqueScore.score);
  });
});
