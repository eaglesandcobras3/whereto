import { describe, expect, it } from "vitest";

import { buildFreeOnboardSeoDescription } from "@/lib/listing-requests/free-onboard-derived";

/** Keep notify message helpers coverable without Resend. */
describe("free onboard notify copy helpers", () => {
  it("keeps seo description aligned with excerpt limits", () => {
    expect(buildFreeOnboardSeoDescription("Live on Scenic 30A.")).toBe("Live on Scenic 30A.");
  });
});
