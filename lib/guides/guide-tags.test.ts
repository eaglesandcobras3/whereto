import { describe, expect, it } from "vitest";
import {
  GUIDE_TAG_ALL_TOWNS,
  guideTagLabel,
  normalizeGuideTag,
  normalizeGuideTags,
} from "@/lib/guides/guide-tags";

describe("guide-tags", () => {
  it("normalizes freeform tags to snake_case", () => {
    expect(normalizeGuideTag("All Towns")).toBe(GUIDE_TAG_ALL_TOWNS);
    expect(normalizeGuideTag("  Family Friendly! ")).toBe("family_friendly");
  });

  it("dedupes tags", () => {
    expect(normalizeGuideTags(["All Towns", "all_towns", "family"])).toEqual([
      "all_towns",
      "family",
    ]);
  });

  it("labels all_towns specially", () => {
    expect(guideTagLabel(GUIDE_TAG_ALL_TOWNS)).toBe("All towns");
    expect(guideTagLabel("family_friendly")).toBe("family friendly");
  });
});
