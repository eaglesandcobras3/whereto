import { describe, expect, it } from "vitest";
import {
  mergeDiscoverLlmParse,
  needsDiscoverLlmFallback,
} from "@/lib/discovery-filters/parse-discover-query-merge";

describe("needsDiscoverLlmFallback", () => {
  it("is true when deterministic did not expand", () => {
    expect(needsDiscoverLlmFallback({ expanded: false, q: "froyo" })).toBe(true);
  });

  it("is true when unresolved terms remain", () => {
    expect(
      needsDiscoverLlmFallback({
        expanded: true,
        category: "coffee_and_treats",
        unresolvedTerms: ["froyo"],
      }),
    ).toBe(true);
  });

  it("is false when fully resolved", () => {
    expect(
      needsDiscoverLlmFallback({
        expanded: true,
        category: "restaurants_and_bars",
        facet: "kid_friendly,lunch",
        town: "seaside",
      }),
    ).toBe(false);
  });
});

describe("mergeDiscoverLlmParse", () => {
  const vocabulary = new Set(["kid_friendly", "lunch", "coffee", "gluten_free"]);

  it("fills category and tags from LLM when deterministic missed them", () => {
    const merged = mergeDiscoverLlmParse(
      { expanded: false, q: "froyo near grayton" },
      {
        type: "storefront",
        town: "grayton-beach",
        category: "coffee_and_treats",
        service_category: null,
        tags: [],
        unresolved_terms: ["froyo"],
        residual_q: null,
      },
      vocabulary,
    );

    expect(merged.expanded).toBe(true);
    expect(merged.town).toBe("grayton-beach");
    expect(merged.category).toBe("coffee_and_treats");
    expect(merged.unresolvedTerms).toContain("froyo");
    expect(merged.resolver).toBe("llm");
  });

  it("keeps deterministic town and merges LLM tags", () => {
    const merged = mergeDiscoverLlmParse(
      {
        expanded: true,
        town: "seaside",
        category: "restaurants_and_bars",
        facet: "lunch",
        unresolvedTerms: ["sushi"],
      },
      {
        type: "storefront",
        town: "rosemary-beach",
        category: "shopping",
        service_category: null,
        tags: ["gluten_free"],
        unresolved_terms: ["sushi"],
        residual_q: null,
      },
      vocabulary,
    );

    expect(merged.town).toBe("seaside");
    expect(merged.category).toBe("restaurants_and_bars");
    expect(merged.facet?.split(",")).toContain("lunch");
    expect(merged.facet?.split(",")).toContain("gluten_free");
    expect(merged.resolver).toBe("hybrid");
  });
});
