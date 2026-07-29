import { describe, expect, it } from "vitest";
import {
  constrainWeights,
  filterRowsForTune,
  overallWithWeights,
  separationForWeights,
  TUNE_WEIGHT_MAX,
  TUNE_WEIGHT_MIN,
  tuneCategoryWeights,
} from "./tune-weights";
import type { CategoryScores } from "./types";
import { CATEGORY_WEIGHTS } from "./weights";

const highContent: CategoryScores = {
  entity: 50,
  content: 95,
  seo: 50,
  discovery: 40,
  trust: 40,
};

const lowContent: CategoryScores = {
  entity: 80,
  content: 20,
  seo: 80,
  discovery: 70,
  trust: 70,
};

describe("overallWithWeights", () => {
  it("weights content more when content weight is high", () => {
    const contentHeavy = {
      ...CATEGORY_WEIGHTS,
      content: 0.7,
      entity: 0.1,
      seo: 0.1,
      discovery: 0.05,
      trust: 0.05,
    };
    const entityHeavy = {
      ...CATEGORY_WEIGHTS,
      entity: 0.7,
      content: 0.1,
      seo: 0.1,
      discovery: 0.05,
      trust: 0.05,
    };
    expect(overallWithWeights(highContent, contentHeavy)).toBeGreaterThan(
      overallWithWeights(highContent, entityHeavy),
    );
  });
});

describe("constrainWeights", () => {
  it("keeps each category within the tune box", () => {
    const w = constrainWeights({
      entity: 0.01,
      content: 0.9,
      seo: 0.01,
      discovery: 0.01,
      trust: 0.07,
    });
    for (const k of ["entity", "content", "seo", "discovery", "trust"] as const) {
      expect(w[k]).toBeGreaterThanOrEqual(TUNE_WEIGHT_MIN - 1e-9);
      expect(w[k]).toBeLessThanOrEqual(TUNE_WEIGHT_MAX + 1e-9);
    }
    const sum = w.entity + w.content + w.seo + w.discovery + w.trust;
    expect(sum).toBeCloseTo(1, 5);
  });
});

describe("tuneCategoryWeights", () => {
  it("finds constrained weights that improve separation without collapsing", () => {
    const rows = [
      { indexed: true, scores: highContent, kind: "business" as const },
      { indexed: true, scores: { ...highContent, content: 90 }, kind: "business" as const },
      { indexed: true, scores: { ...highContent, content: 88 }, kind: "guide" as const },
      { indexed: true, scores: { ...highContent, content: 92 }, kind: "town" as const },
      { indexed: false, scores: lowContent, kind: "business" as const },
      { indexed: false, scores: { ...lowContent, content: 25 }, kind: "guide" as const },
      { indexed: false, scores: { ...lowContent, content: 15 }, kind: "area" as const },
      // Thin category hubs that would dominate unconstrained tuning
      {
        indexed: false,
        scores: { entity: 90, content: 5, seo: 10, discovery: 5, trust: 5 },
        kind: "category" as const,
      },
      {
        indexed: false,
        scores: { entity: 85, content: 8, seo: 12, discovery: 4, trust: 6 },
        kind: "category" as const,
      },
    ];

    const tuned = tuneCategoryWeights(rows, { samples: 1000, seed: 7 });

    expect(tuned.tuneKinds).not.toContain("category");
    expect(tuned.bestSeparation).not.toBeNull();
    for (const k of ["entity", "content", "seo", "discovery", "trust"] as const) {
      expect(tuned.bestWeights[k]).toBeGreaterThanOrEqual(TUNE_WEIGHT_MIN - 1e-6);
      expect(tuned.bestWeights[k]).toBeLessThanOrEqual(TUNE_WEIGHT_MAX + 1e-6);
    }
  });

  it("filterRowsForTune drops categories by default kinds", () => {
    const rows = [
      { indexed: true, scores: highContent, kind: "business" as const },
      { indexed: false, scores: lowContent, kind: "category" as const },
    ];
    expect(filterRowsForTune(rows, ["business", "guide", "town", "area"])).toHaveLength(1);
  });
});
