import { describe, expect, it } from "vitest";
import { detectQueryThemes } from "@/lib/ask/search-input";
import { buildIntentFromFacets } from "@/lib/ask/search-facet-intent";
import { resolveSearchFacets } from "@/lib/ask/search-facets";
import { planDiscoveryStrategies } from "@/lib/ask/discovery-strategies";

describe("resolveSearchFacets", () => {
  it("activates coffee + bakery only when user chose bakery item (not ice cream)", () => {
    const query =
      "looking for a place to grab coffee that has treats for kids. Rosemary Beach. Bakery item";
    const themes = detectQueryThemes(query);
    const facets = resolveSearchFacets({
      effectiveQuery: query,
      themes,
      townOrArea: "Rosemary Beach",
      vibeTags: ["kid_friendly"],
    });
    expect(facets.active).toContain("coffee");
    expect(facets.active).toContain("bakery");
    expect(facets.active).not.toContain("ice_cream");
    expect(facets.explicitTreat).toBe("bakery");
    expect(facets.constraints.townOrArea).toBe("Rosemary Beach");
    expect(facets.constraints.vibeTags).toContain("kid_friendly");
    expect(facets.planComplete).toBe(true);
  });

  it("uses ambiguous treat policy when treats are mentioned without a subtype", () => {
    const query = "coffee with treats for kids";
    const themes = detectQueryThemes(query);
    const facets = resolveSearchFacets({ effectiveQuery: query, themes });
    expect(facets.active).toContain("coffee");
    expect(facets.active).toContain("bakery");
    expect(facets.active).toContain("ice_cream");
    expect(facets.explicitTreat).toBeNull();
  });

  it("activates only ice cream when explicitly requested", () => {
    const query = "ice cream near Seaside";
    const facets = resolveSearchFacets({
      effectiveQuery: query,
      themes: detectQueryThemes(query),
    });
    expect(facets.active).toEqual(["ice_cream"]);
    expect(facets.constraints.townOrArea).toBe("seaside");
  });

  it("resolves meal period and dining facet from breakfast query", () => {
    const query = "breakfast in Seaside";
    const facets = resolveSearchFacets({
      effectiveQuery: query,
      themes: detectQueryThemes(query),
    });
    expect(facets.active).toContain("dining");
    expect(facets.constraints.mealPeriod).toBe("breakfast");
    expect(facets.constraints.townOrArea).toBe("seaside");
  });

  it("merges dietary tags from clarify input", () => {
    const query = "lunch in Rosemary Beach";
    const facets = resolveSearchFacets({
      effectiveQuery: query,
      themes: detectQueryThemes(query),
      dietaryTags: ["gluten_free"],
      townOrArea: "Rosemary Beach",
    });
    expect(facets.constraints.dietaryNeeds).toContain("gluten_free");
  });
});

describe("buildIntentFromFacets", () => {
  it("builds coffee intent with bakery specific items when treat is explicit", () => {
    const query =
      "looking for coffee with treats for kids. Rosemary Beach. Bakery item";
    const facets = resolveSearchFacets({
      effectiveQuery: query,
      themes: detectQueryThemes(query),
      townOrArea: "Rosemary Beach",
    });
    const intent = buildIntentFromFacets(facets, {
      normalized: query.toLowerCase(),
      toolCategorySlug: null,
    });
    expect(intent.category).toBe("coffee_shops");
    expect(intent.location?.town).toBe("Rosemary Beach");
    expect(intent.specific_items).toEqual(
      expect.arrayContaining(["bakery", "pastries"]),
    );
  });
});

describe("planDiscoveryStrategies (facet-driven)", () => {
  it("skips ice cream strategy when bakery item was chosen", () => {
    const query =
      "looking for coffee with treats for kids. Rosemary Beach. Bakery item";
    const strategies = planDiscoveryStrategies({
      effectiveQuery: query,
      themes: detectQueryThemes(query),
      toolCategorySlug: null,
    });
    expect(strategies.map((s) => s.id)).toContain("coffee_shops");
    expect(strategies.map((s) => s.id)).toContain("bakery_restaurants");
    expect(strategies.map((s) => s.id)).not.toContain("dessert_sweets");
  });
});
