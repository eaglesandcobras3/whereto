import { describe, expect, it } from "vitest";
import { rankMergedDiscoveryResults } from "@/lib/ask/rank-merged-results";
import type { DiscoveryStrategy } from "@/lib/ask/discovery-strategies";
import type { SearchResultPayload } from "@/lib/search/types";

function rec(
  id: string,
  name: string,
  composite: number,
  categoryName: string,
) {
  return {
    business_id: id,
    rank: 1,
    headline: name,
    explanation: "",
    highlighted_tags: [],
    business: {
      id,
      name,
      category_name: categoryName,
      tags: [],
    },
    score_breakdown: {
      composite,
      vec_similarity: composite,
      structured_match: 0.8,
      data_quality: 0.7,
      learning_boost: 0,
      geo_score: 0.5,
    },
  };
}

function payload(recommendations: SearchResultPayload["recommendations"]): SearchResultPayload {
  return {
    query: "coffee treats",
    query_hash: "x",
    normalized_query: "coffee treats",
    summary: "",
    total_results: recommendations.length,
    recommendations,
    suggestions: [],
    cached: false,
  };
}

const coffeeStrategy: DiscoveryStrategy = {
  id: "coffee_shops",
  label: "Coffee & cafes",
  rawQuery: "coffee",
  categorySlug: "coffee_shops",
  weight: 1,
  matchHint: "coffee or café",
};

const bakeryStrategy: DiscoveryStrategy = {
  id: "bakery_restaurants",
  label: "Bakery & pastries",
  rawQuery: "coffee bakery pastries",
  categorySlug: "restaurants",
  weight: 0.84,
  matchHint: "bakery goods and pastries",
};

describe("rankMergedDiscoveryResults", () => {
  it("ranks coffee shops above bakery-only restaurants when primary facet is coffee", () => {
    const coffeeShop = rec("a", "Amavida - Rosemary", 0.69, "Coffee Shops");
    const tapasChocolate = rec("b", "La Crema Tapas & Chocolate", 0.78, "Restaurants");
    const cafe = rec("c", "Charlie's Café", 0.72, "Restaurants");

    const ranked = rankMergedDiscoveryResults({
      strategies: [coffeeStrategy, bakeryStrategy],
      payloads: [
        { strategy: coffeeStrategy, payload: payload([coffeeShop]) },
        { strategy: bakeryStrategy, payload: payload([tapasChocolate, cafe]) },
      ],
      primaryQuery: "coffee with treats",
      limit: 5,
      wantKids: true,
      wantTreats: true,
      primaryFacet: "coffee",
    });

    const titles = ranked.reviewNotes.map((n) => n.title);
    expect(titles[0]).toBe("Amavida - Rosemary");
    expect(titles.indexOf("La Crema Tapas & Chocolate")).toBeGreaterThan(0);
    expect(titles.indexOf("La Crema Tapas & Chocolate")).toBeGreaterThan(
      titles.indexOf("Amavida - Rosemary"),
    );
  });

  it("ranks in-town coffee above nearby-town coffee when anchor town is set", () => {
    const inTown = rec("a", "Amavida - Rosemary", 0.62, "Coffee Shops");
    inTown.business.town_name = "Rosemary Beach";
    const nearTown = rec("b", "3rd Cup Coffee", 0.68, "Coffee Shops");
    nearTown.business.town_name = "Seaside";

    const ranked = rankMergedDiscoveryResults({
      strategies: [
        { ...coffeeStrategy, id: "coffee_shops_near", scopeOverride: "near" as const },
      ],
      payloads: [
        {
          strategy: { ...coffeeStrategy, id: "coffee_shops", scopeOverride: undefined },
          payload: payload([inTown]),
        },
        {
          strategy: {
            ...coffeeStrategy,
            id: "coffee_shops_near",
            scopeOverride: "near",
          },
          payload: payload([nearTown]),
        },
      ],
      primaryQuery: "coffee rosemary beach",
      limit: 5,
      wantKids: false,
      wantTreats: false,
      primaryFacet: "coffee",
      anchorTownName: "Rosemary Beach",
    });

    expect(ranked.reviewNotes[0]?.title).toBe("Amavida - Rosemary");
  });
});
