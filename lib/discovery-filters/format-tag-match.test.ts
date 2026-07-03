import { describe, expect, it } from "vitest";
import { formatTagMatchSummary } from "./format-tag-match";

describe("formatTagMatchSummary", () => {
  it("explains partial matches for required and optional tags", () => {
    const summary = formatTagMatchSummary(
      {
        matched_required: ["gluten_free"],
        missing_required: [],
        matched_any: [],
        missing_any: ["donuts"],
        strict_match: true,
      },
      (slug) => (slug === "gluten_free" ? "Gluten free" : "Donuts"),
    );
    expect(summary).toBe("Has Gluten free · Unconfirmed: Donuts");
  });

  it("explains relaxed matches when required tags are missing", () => {
    const summary = formatTagMatchSummary(
      {
        matched_required: [],
        missing_required: ["gluten_free"],
        matched_any: ["donuts"],
        missing_any: [],
        strict_match: false,
      },
      (slug) => (slug === "gluten_free" ? "Gluten free" : "Donuts"),
    );
    expect(summary).toBe("Missing Gluten free · Also has Donuts");
  });
});
