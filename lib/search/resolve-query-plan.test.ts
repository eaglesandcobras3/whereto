import { describe, expect, it } from "vitest";
import { resolveQueryPlan } from "@/lib/search/resolve-query-plan";

// ── Collision pairs: substring_collision class ────────────────────────────────

describe("collision_mobility_rental vs collision_golf_activity", () => {
  it("routes 'golf carts' to mobility_rental, not golf courses", () => {
    const plan = resolveQueryPlan("golf carts");
    expect(plan.matchedRuleId).toBe("collision_mobility_rental");
    expect(plan.requiredTags).toContain("mobility_rental");
    expect(plan.categorySlug).toBe("activities");
  });

  it("routes 'golf cart' (singular) to mobility_rental", () => {
    const plan = resolveQueryPlan("golf cart");
    expect(plan.matchedRuleId).toBe("collision_mobility_rental");
    expect(plan.requiredTags).toContain("mobility_rental");
  });

  it("routes 'cart rental' to mobility_rental", () => {
    const plan = resolveQueryPlan("cart rental near rosemary");
    expect(plan.matchedRuleId).toBe("collision_mobility_rental");
    expect(plan.requiredTags).toContain("mobility_rental");
  });

  it("routes 'golf course tee time' to golf activity, NOT mobility_rental", () => {
    const plan = resolveQueryPlan("golf course tee time");
    expect(plan.matchedRuleId).toBe("collision_golf_activity");
    expect(plan.requiredTags).toContain("golf");
    expect(plan.requiredTags).not.toContain("mobility_rental");
  });

  it("routes 'tee time' to golf activity", () => {
    const plan = resolveQueryPlan("tee time");
    expect(plan.matchedRuleId).toBe("collision_golf_activity");
    expect(plan.requiredTags).toContain("golf");
  });

  it("bare 'golf' does NOT match either collision rule (no phrase match)", () => {
    // 'golf' alone is not in either rule's phrases list — falls through to FTS
    const plan = resolveQueryPlan("golf");
    expect(plan.matchedRuleId).toBeNull();
    expect(plan.requiredTags).toHaveLength(0);
  });
});

describe("collision_books_retail", () => {
  it("routes 'bookstore' to books tag", () => {
    const plan = resolveQueryPlan("bookstore");
    expect(plan.matchedRuleId).toBe("collision_books_retail");
    expect(plan.requiredTags).toContain("books");
    expect(plan.categorySlug).toBe("shopping");
  });

  it("routes 'bookstore books reading' to books tag", () => {
    const plan = resolveQueryPlan("bookstore books reading");
    expect(plan.matchedRuleId).toBe("collision_books_retail");
    expect(plan.requiredTags).toContain("books");
  });

  it("routes bare 'books' to books tag", () => {
    const plan = resolveQueryPlan("books");
    expect(plan.matchedRuleId).toBe("collision_books_retail");
    expect(plan.requiredTags).toContain("books");
  });
});

// ── Category keywords ─────────────────────────────────────────────────────────

describe("category_coffee", () => {
  it("routes 'coffee' to coffee_shops", () => {
    const plan = resolveQueryPlan("coffee");
    expect(plan.matchedRuleId).toBe("category_coffee");
    expect(plan.categorySlug).toBe("coffee_shops");
  });

  it("routes 'morning coffee latte cappuccino' to coffee_shops", () => {
    const plan = resolveQueryPlan("morning coffee latte cappuccino");
    expect(plan.matchedRuleId).toBe("category_coffee");
    expect(plan.categorySlug).toBe("coffee_shops");
  });

  it("routes 'coffee in rosemary beach' to coffee_shops", () => {
    const plan = resolveQueryPlan("coffee in rosemary beach");
    expect(plan.matchedRuleId).toBe("category_coffee");
    expect(plan.categorySlug).toBe("coffee_shops");
  });
});

// ── Explicit overrides always win ────────────────────────────────────────────

describe("explicit overrides", () => {
  it("explicit categorySlug overrides rule-derived categorySlug", () => {
    const plan = resolveQueryPlan("golf carts", { categorySlug: "restaurants" });
    expect(plan.categorySlug).toBe("restaurants");
    // requiredTags still come from the rule
    expect(plan.requiredTags).toContain("mobility_rental");
  });

  it("explicit townSlug is set from caller, not rule", () => {
    const plan = resolveQueryPlan("coffee", { townSlug: "rosemary-beach" });
    expect(plan.townSlug).toBe("rosemary-beach");
    expect(plan.categorySlug).toBe("coffee_shops");
  });
});

// ── No-match fallback ────────────────────────────────────────────────────────

describe("no rule match — FTS fallback", () => {
  it("unmatched query gets searchTerms from normalized tokens", () => {
    const plan = resolveQueryPlan("romantic waterfront dinner");
    expect(plan.matchedRuleId).toBeNull();
    expect(plan.searchTerms).toContain("romantic");
    expect(plan.searchTerms).toContain("waterfront");
    expect(plan.searchTerms).toContain("dinner");
    expect(plan.categorySlug).toBeNull();
    expect(plan.requiredTags).toHaveLength(0);
  });

  it("private chef query falls through with service category from explicit", () => {
    const plan = resolveQueryPlan("private chef catering", {
      serviceCategorySlug: "private_chef",
    });
    expect(plan.matchedRuleId).toBeNull();
    expect(plan.serviceCategorySlug).toBe("private_chef");
  });
});

// ── Longest-phrase-wins ───────────────────────────────────────────────────────

describe("longest phrase wins", () => {
  it("'golf carts' matches collision_mobility_rental not collision_golf_activity", () => {
    // Both rules have phrases containing 'golf'. 'golf carts' (10 chars) beats 'golf course' (11)
    // but 'golf carts' also beats any rule whose phrase length < 'golf carts'.
    // collision_mobility_rental phrases include 'golf cart' (9) and 'golf carts' (10).
    // collision_golf_activity phrases include 'golf course' (11), 'tee time' (8), etc.
    // For query "golf carts": 'golf carts' (len 10) matches mobility_rental before
    // shorter phrases from golf_activity can match.
    const plan = resolveQueryPlan("golf carts rental on 30a");
    expect(plan.matchedRuleId).toBe("collision_mobility_rental");
  });
});
