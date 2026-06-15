import { describe, expect, it } from "vitest";
import { computeV2RelevanceBoost } from "@/lib/search/v2-relevance-boost";
import { emptyQueryPlan } from "@/lib/search/query-plan-v2";
import { v2EmbeddingInput } from "@/lib/search/v2-embedding-input";

describe("computeV2RelevanceBoost", () => {
  it("boosts listings whose tags match ice cream queries", () => {
    const plan = emptyQueryPlan("ice cream shop", "ice cream shop");
    plan.searchTerms = ["ice cream", "dessert"];
    const boost = computeV2RelevanceBoost(
      { title: "b.f.f. frozens", search_tags: ["ice cream", "frozen treats"], business_type: "ice cream bar" },
      "ice cream shop",
      plan,
    );
    expect(boost).toBeGreaterThan(0.05);
  });

  it("boosts wifi-tagged cafes for remote work queries", () => {
    const plan = emptyQueryPlan("laptop wifi", "laptop wifi");
    plan.searchTerms = ["wifi", "laptop", "coffee"];
    const boost = computeV2RelevanceBoost(
      { title: "3rd Cup Coffee", search_tags: ["coffee", "wifi", "cozy"], business_type: "coffee shop" },
      "best place to work remote laptop wifi",
      plan,
    );
    expect(boost).toBeGreaterThan(0.04);
  });
});

describe("v2EmbeddingInput", () => {
  it("combines normalized query with rule search terms", () => {
    const plan = emptyQueryPlan("nightlife bars live music 30a", "nightlife bars live music 30a");
    plan.searchTerms = ["bar", "live music"];
    expect(v2EmbeddingInput(plan, plan.normalizedQuery)).toContain("nightlife");
    expect(v2EmbeddingInput(plan, plan.normalizedQuery)).toContain("live music");
  });
});
