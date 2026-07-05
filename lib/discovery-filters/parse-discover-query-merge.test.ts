import { describe, expect, it } from "vitest";
import {
  describeDiscoverParseDoubt,
  isExtremelyConfidentDeterministicParse,
  mergeDiscoverLlmParse,
  needsDiscoverLlmFallback,
} from "@/lib/discovery-filters/parse-discover-query-merge";

const ruleOnlySignals = {
  matchedRuleId: "category_coffee",
  hasResidualQ: false,
  usedHeuristicCategory: false,
  usedAliasOrThemeCategory: false,
};

describe("describeDiscoverParseDoubt", () => {
  it("reports high confidence for clean rule matches", () => {
    const report = describeDiscoverParseDoubt({
      expanded: true,
      category: "coffee_and_treats",
      type: "storefront",
      deterministicSignals: ruleOnlySignals,
    });
    expect(report.confidence).toBe("high");
    expect(report.doubtReasons).not.toContain("no_rule_match");
  });

  it("lists doubt reasons for heuristic expansion", () => {
    const report = describeDiscoverParseDoubt({
      expanded: true,
      category: "restaurants_and_bars",
      facet: "kid_friendly,lunch",
      town: "seaside",
      deterministicSignals: {
        matchedRuleId: undefined,
        hasResidualQ: false,
        usedHeuristicCategory: true,
        usedAliasOrThemeCategory: false,
      },
    });
    expect(report.confidence).toBe("low");
    expect(report.doubtReasons).toContain("heuristic_category");
    expect(report.doubtReasons).toContain("no_rule_match");
  });
});

describe("isExtremelyConfidentDeterministicParse", () => {
  it("is true only for a clean rule match with structured output", () => {
    expect(
      isExtremelyConfidentDeterministicParse(
        {
          expanded: true,
          category: "coffee_and_treats",
          type: "storefront",
        },
        ruleOnlySignals,
      ),
    ).toBe(true);
  });

  it("is false without a matched rule", () => {
    expect(
      isExtremelyConfidentDeterministicParse(
        {
          expanded: true,
          category: "restaurants_and_bars",
          facet: "kid_friendly,lunch",
          town: "seaside",
        },
        {
          matchedRuleId: undefined,
          hasResidualQ: false,
          usedHeuristicCategory: true,
          usedAliasOrThemeCategory: false,
        },
      ),
    ).toBe(false);
  });

  it("is false when residual q remains", () => {
    expect(
      isExtremelyConfidentDeterministicParse(
        {
          expanded: true,
          category: "coffee_and_treats",
          q: "wifi",
        },
        { ...ruleOnlySignals, hasResidualQ: true },
      ),
    ).toBe(false);
  });

  it("is false when alias or theme set category", () => {
    expect(
      isExtremelyConfidentDeterministicParse(
        {
          expanded: true,
          category: "coffee_and_treats",
          town: "seaside",
        },
        { ...ruleOnlySignals, usedAliasOrThemeCategory: true },
      ),
    ).toBe(false);
  });
});

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
        deterministicSignals: {
          matchedRuleId: undefined,
          hasResidualQ: false,
          usedHeuristicCategory: false,
          usedAliasOrThemeCategory: true,
        },
      }),
    ).toBe(true);
  });

  it("is true for heuristic-only expansion even when fully structured", () => {
    expect(
      needsDiscoverLlmFallback({
        expanded: true,
        category: "restaurants_and_bars",
        facet: "kid_friendly,lunch",
        town: "seaside",
        deterministicSignals: {
          matchedRuleId: undefined,
          hasResidualQ: false,
          usedHeuristicCategory: true,
          usedAliasOrThemeCategory: false,
        },
      }),
    ).toBe(true);
  });

  it("is false only for extreme-confidence rule matches", () => {
    expect(
      needsDiscoverLlmFallback({
        expanded: true,
        category: "coffee_and_treats",
        type: "storefront",
        deterministicSignals: ruleOnlySignals,
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
