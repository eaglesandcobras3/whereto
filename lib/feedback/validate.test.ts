import { describe, it, expect } from "vitest";
import {
  parseFeedbackBody,
  shouldUpsertSuppression,
} from "@/lib/feedback/validate";

describe("parseFeedbackBody", () => {
  it("accepts valid payload", () => {
    const r = parseFeedbackBody({
      business_id: "550e8400-e29b-41d4-a716-446655440000",
      feedback_type: "not_relevant",
      session_id: "s1",
    });
    expect(r.ok && r.data.feedback_type).toBe("not_relevant");
  });

  it("rejects unknown type", () => {
    const r = parseFeedbackBody({
      business_id: "550e8400-e29b-41d4-a716-446655440000",
      feedback_type: "spam",
    });
    expect(r.ok).toBe(false);
  });

  it("rejects missing business_id", () => {
    expect(parseFeedbackBody({ feedback_type: "not_relevant" }).ok).toBe(false);
  });
});

describe("shouldUpsertSuppression", () => {
  it("is true for hide/bad experience when signed in", () => {
    expect(shouldUpsertSuppression("hide_for_me", "u1")).toBe(true);
    expect(
      shouldUpsertSuppression("had_bad_experience", "u1"),
    ).toBe(true);
  });

  it("is false without user", () => {
    expect(shouldUpsertSuppression("hide_for_me", null)).toBe(false);
    expect(shouldUpsertSuppression("not_relevant", "u1")).toBe(false);
  });
});
