import { describe, expect, it } from "vitest";
import { analyzeTagMatch, compareTagMatchScore, resolveTagMatchMode } from "./tag-match";

describe("tag-match", () => {
  it("scores strict matches higher than partial", () => {
    const fullMatch = analyzeTagMatch(["gluten_free", "donuts"], ["gluten_free", "donuts"], []);
    const partial = analyzeTagMatch(["gluten_free"], ["gluten_free", "donuts"], []);
    expect(fullMatch.score).toBeGreaterThan(partial.score);
    expect(partial.missing_required).toEqual(["donuts"]);
    expect(fullMatch.strict_match).toBe(true);
    expect(partial.strict_match).toBe(false);
    expect(partial.relaxed_match).toBe(true);
  });

  it("requires at least one optional tag when only any tags are set", () => {
    const match = analyzeTagMatch(["donuts"], [], ["donuts", "gluten_free"]);
    expect(match.strict_match).toBe(true);
    expect(match.matched_any).toEqual(["donuts"]);
    expect(match.missing_any).toEqual(["gluten_free"]);
  });

  it("relaxed mode matches union of required and any", () => {
    const match = analyzeTagMatch(["donuts"], ["gluten_free"], ["donuts"]);
    expect(match.strict_match).toBe(false);
    expect(match.relaxed_match).toBe(true);
    expect(match.matched_required).toEqual([]);
    expect(match.matched_any).toEqual(["donuts"]);
    expect(match.missing_required).toEqual(["gluten_free"]);
  });

  it("strict with required satisfied ranks higher when optional also matches", () => {
    const both = analyzeTagMatch(["gluten_free", "donuts"], ["gluten_free"], ["donuts"]);
    const requiredOnly = analyzeTagMatch(["gluten_free"], ["gluten_free"], ["donuts"]);
    expect(both.strict_match).toBe(true);
    expect(requiredOnly.strict_match).toBe(true);
    expect(compareTagMatchScore(both, requiredOnly)).toBeLessThan(0);
  });
});

describe("resolveTagMatchMode", () => {
  it("uses relaxed when strict is empty", () => {
    expect(resolveTagMatchMode(0, 5)).toBe("relaxed");
    expect(resolveTagMatchMode(0, 0)).toBe("none");
  });

  it("supplements thin strict results with relaxed matches", () => {
    expect(resolveTagMatchMode(2, 8)).toBe("supplement");
    expect(resolveTagMatchMode(3, 8)).toBe("strict");
  });
});
