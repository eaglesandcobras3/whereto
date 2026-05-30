import { describe, expect, it } from "vitest";
import {
  computeConfidenceScore,
  CONFIDENCE_HIGH,
  CONFIDENCE_LOW,
  followUpSuggested,
  handoffRequired,
} from "@/lib/ask/confidence";

describe("computeConfidenceScore", () => {
  it("returns low score when no results", () => {
    expect(computeConfidenceScore({ resultCount: 0 })).toBe(0.1);
  });

  it("increases with result count and vector strength", () => {
    const weak = computeConfidenceScore({ resultCount: 1, topVec: 0.35 });
    const strong = computeConfidenceScore({
      resultCount: 6,
      topVec: 0.8,
      topComposite: 0.55,
      retrievalPath: "hybrid_strict",
      hasTownFilter: true,
    });
    expect(strong).toBeGreaterThan(weak);
    expect(strong).toBeGreaterThanOrEqual(CONFIDENCE_HIGH);
  });
});

describe("handoffRequired", () => {
  it("requires handoff below CONFIDENCE_LOW", () => {
    expect(handoffRequired(CONFIDENCE_LOW - 0.01)).toBe(true);
    expect(handoffRequired(CONFIDENCE_LOW)).toBe(false);
  });
});

describe("followUpSuggested", () => {
  it("suggests follow-up in the medium band", () => {
    expect(followUpSuggested(0.5)).toBe(true);
    expect(followUpSuggested(CONFIDENCE_HIGH)).toBe(false);
  });
});
