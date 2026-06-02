import { describe, expect, it } from "vitest";
import type { ClarificationFormArtifact } from "@/lib/ask/types";
import {
  composeClarificationSearchQuery,
  isClarificationFollowUp,
} from "@/lib/ask/clarifying-query";

describe("clarification follow-up helpers", () => {
  it("detects clarification_form artifacts", () => {
    expect(isClarificationFollowUp(undefined)).toBe(false);
    expect(isClarificationFollowUp({ type: "business_results" })).toBe(false);
    const form: ClarificationFormArtifact = {
      type: "clarification_form",
      questions: [],
      originalQuery: "coffee with treats",
    };
    expect(isClarificationFollowUp(form)).toBe(true);
  });

  it("merges original query with chip-form answers", () => {
    expect(
      composeClarificationSearchQuery(
        "coffee with treats for kids",
        "Seaside / WaterColor • Ice cream / gelato",
      ),
    ).toBe(
      "coffee with treats for kids. Seaside / WaterColor • Ice cream / gelato",
    );
  });
});
