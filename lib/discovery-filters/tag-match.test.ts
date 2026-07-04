import { describe, expect, it } from "vitest";
import { analyzeTagMatch, compareTagMatchScore } from "./tag-match";

describe("analyzeTagMatch", () => {
  it("scores listings with more matched tags higher", () => {
    const both = analyzeTagMatch(["gluten_free", "donuts"], ["gluten_free", "donuts"]);
    const one = analyzeTagMatch(["gluten_free"], ["gluten_free", "donuts"]);
    expect(both.score).toBeGreaterThan(one.score);
    expect(both.matched).toEqual(["gluten_free", "donuts"]);
    expect(one.missing).toEqual(["donuts"]);
    expect(both.matches).toBe(true);
    expect(one.matches).toBe(true);
  });

  it("requires at least one selected tag to match", () => {
    const match = analyzeTagMatch(["coffee"], ["donuts", "gluten_free"]);
    expect(match.matches).toBe(false);
    expect(match.matched).toEqual([]);
    expect(match.missing).toEqual(["donuts", "gluten_free"]);
  });

  it("treats empty selection as matching everything", () => {
    const match = analyzeTagMatch(["donuts"], []);
    expect(match.matches).toBe(true);
    expect(match.score).toBe(0);
  });
});

describe("compareTagMatchScore", () => {
  it("prefers higher match counts", () => {
    const better = analyzeTagMatch(["a", "b"], ["a", "b", "c"]);
    const worse = analyzeTagMatch(["a"], ["a", "b", "c"]);
    expect(compareTagMatchScore(better, worse)).toBeLessThan(0);
  });
});
