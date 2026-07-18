import { describe, expect, it } from "vitest";
import { bandForScore, clampScore, mergeCategoryResults, sumCheckContributions } from "./aggregate";
import { INDEX_READY_THRESHOLD } from "./weights";
import { buildScoreResult } from "./aggregate";

describe("clampScore / bandForScore", () => {
  it("clamps to 0–100", () => {
    expect(clampScore(-5)).toBe(0);
    expect(clampScore(150)).toBe(100);
    expect(clampScore(84.4)).toBe(84);
  });

  it("maps bands per PRD thresholds", () => {
    expect(bandForScore(96)).toBe("exceptional");
    expect(bandForScore(92)).toBe("featured_ready");
    expect(bandForScore(84)).toBe("index_ready");
    expect(bandForScore(75)).toBe("needs_improvement");
    expect(bandForScore(65)).toBe("needs_significant_work");
    expect(bandForScore(40)).toBe("not_ready");
  });
});

describe("sumCheckContributions", () => {
  it("scores applicable contributions", () => {
    const { score, dataCompleteness } = sumCheckContributions([
      { points: 10, max: 10, applicable: true },
      { points: 0, max: 10, applicable: true },
      { points: 5, max: 5, applicable: false },
    ]);
    expect(score).toBe(50);
    expect(dataCompleteness).toBe(1);
  });
});

describe("mergeCategoryResults / indexReady", () => {
  it("weights categories and sets indexReady at 80+", () => {
    const merged = mergeCategoryResults({
      entity: { score: 100, flags: [], recommendations: [], dataCompleteness: 1 },
      content: { score: 100, flags: [], recommendations: [], dataCompleteness: 1 },
      seo: { score: 100, flags: [], recommendations: [], dataCompleteness: 1 },
      discovery: { score: 100, flags: [], recommendations: [], dataCompleteness: 1 },
      trust: { score: 100, flags: [], recommendations: [], dataCompleteness: 1 },
    });
    expect(merged.overallScore).toBe(100);

    const ready = buildScoreResult({
      kind: "business",
      slug: "x",
      path: "/business/x",
      scores: merged.scores,
      overallScore: INDEX_READY_THRESHOLD,
      flags: [],
      recommendations: [],
      confidence: 0.9,
    });
    expect(ready.indexReady).toBe(true);
    expect(ready.band).toBe("index_ready");

    const notReady = buildScoreResult({
      kind: "business",
      slug: "x",
      path: "/business/x",
      scores: merged.scores,
      overallScore: 79,
      flags: [],
      recommendations: [],
      confidence: 0.5,
    });
    expect(notReady.indexReady).toBe(false);
  });
});
