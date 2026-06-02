import { describe, expect, it } from "vitest";
import { planDiscoveryStrategies } from "@/lib/ask/discovery-strategies";
import {
  buildAskSearchQuery,
  detectQueryThemes,
  normalizeAskVibeTags,
} from "@/lib/ask/search-input";

describe("buildAskSearchQuery", () => {
  it("uses full user message when tool query is a bare keyword", () => {
    const q = buildAskSearchQuery(
      "coffee",
      "coffee place with treats that kids would like",
    );
    expect(q).toContain("treats");
    expect(q).toContain("kids");
  });
});

describe("normalizeAskVibeTags", () => {
  it("maps kids to kid_friendly and drops treats", () => {
    expect(normalizeAskVibeTags(["kids", "treats"])).toEqual(["kid_friendly"]);
  });
});

describe("planDiscoveryStrategies", () => {
  it("plans coffee + bakery + dessert passes for kid treats question", () => {
    const query =
      "coffee place with treats that kids would like on 30A";
    const themes = detectQueryThemes(query);
    const strategies = planDiscoveryStrategies({
      effectiveQuery: query,
      themes,
      toolCategorySlug: "coffee_shops",
      vibeTags: ["kid_friendly"],
    });
    expect(strategies.map((s) => s.id)).toEqual(
      expect.arrayContaining(["coffee_shops", "bakery_restaurants", "dessert_sweets"]),
    );
    expect(strategies.length).toBeGreaterThanOrEqual(3);
  });

});
