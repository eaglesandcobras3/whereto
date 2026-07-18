import { describe, expect, it } from "vitest";
import { centroidOf, computeConfidence, scoreVectorSimilarity } from "./confidence";
import { CONFIDENCE_PEER_MIN } from "./weights";

describe("computeConfidence", () => {
  it("uses completeness alone without enough peers", () => {
    expect(
      computeConfidence({
        dataCompleteness: 0.8,
        scores: { entity: 80, content: 80, seo: 80, discovery: 80, trust: 80 },
        indexedPeerCount: 5,
        indexedPeerCentroid: { entity: 90, content: 90, seo: 90, discovery: 90, trust: 90 },
      }),
    ).toBe(0.8);
  });

  it("blends peer similarity when peers exist", () => {
    const conf = computeConfidence({
      dataCompleteness: 1,
      scores: { entity: 90, content: 90, seo: 90, discovery: 90, trust: 90 },
      indexedPeerCount: CONFIDENCE_PEER_MIN,
      indexedPeerCentroid: { entity: 90, content: 90, seo: 90, discovery: 90, trust: 90 },
    });
    expect(conf).toBe(1);
  });
});

describe("scoreVectorSimilarity / centroidOf", () => {
  it("returns 1 for identical vectors", () => {
    const v = { entity: 50, content: 50, seo: 50, discovery: 50, trust: 50 };
    expect(scoreVectorSimilarity(v, v)).toBe(1);
  });

  it("averages centroids", () => {
    const c = centroidOf([
      { entity: 100, content: 0, seo: 0, discovery: 0, trust: 0 },
      { entity: 0, content: 0, seo: 0, discovery: 0, trust: 0 },
    ]);
    expect(c?.entity).toBe(50);
  });
});
