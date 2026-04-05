import { describe, expect, it } from "vitest";
import { runMiningPipeline, MIN_MENTIONS_TO_PERSIST } from "./pipeline";

describe("runMiningPipeline", () => {
  it("produces buckets when phrases meet mention threshold", () => {
    const html = `
      <html><body>
        <p>yoga yoga pilates massage spa day</p>
        <p>brunch brunch spot morning coffee</p>
      </body></html>
    `;
    const { buckets, meta } = runMiningPipeline({
      html,
      sourceType: "manual_local_html_input",
      regionId: null,
      townBias: "seaside",
    });
    expect(meta.inputBytes).toBeGreaterThan(0);
    expect(meta.candidatesPassed).toBe(buckets.length);
    const yoga = buckets.find((b) => b.normalized_category === "wellness_spa");
    const brunch = buckets.find((b) => b.normalized_category === "brunch_breakfast");
    expect(yoga?.hits).toBeGreaterThanOrEqual(MIN_MENTIONS_TO_PERSIST);
    expect(brunch?.hits).toBeGreaterThanOrEqual(MIN_MENTIONS_TO_PERSIST);
  });

  it("throws on oversized input", () => {
    const huge = "a".repeat(600 * 1024);
    expect(() =>
      runMiningPipeline({
        html: huge,
        sourceType: "operator_curated_sample",
        regionId: null,
        townBias: null,
      }),
    ).toThrow("INPUT_TOO_LARGE");
  });
});
