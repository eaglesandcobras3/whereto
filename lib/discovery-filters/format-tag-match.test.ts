import { describe, expect, it } from "vitest";
import { formatTagMatchSummary } from "./format-tag-match";

describe("formatTagMatchSummary", () => {
  it("explains partial tag matches", () => {
    const summary = formatTagMatchSummary(
      {
        matched: ["gluten_free"],
        missing: ["donuts"],
      },
      (slug) => (slug === "gluten_free" ? "Gluten free" : "Donuts"),
    );
    expect(summary).toBe("Has Gluten free · Missing Donuts");
  });

  it("returns null when nothing to report", () => {
    const summary = formatTagMatchSummary(
      { matched: [], missing: [] },
      (slug) => slug,
    );
    expect(summary).toBeNull();
  });
});
