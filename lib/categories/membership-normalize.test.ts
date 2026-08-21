import { describe, expect, it } from "vitest";
import {
  assertLeafCategoryIds,
  BUSINESS_CATEGORY_MEMBERSHIP_MAX,
  normalizeMembershipIds,
} from "@/lib/categories/membership-normalize";

describe("normalizeMembershipIds", () => {
  it("puts primary first and dedupes", () => {
    const out = normalizeMembershipIds({
      primaryId: "a",
      categoryIds: ["b", "a", "c", "b"],
    });
    expect(out.primaryId).toBe("a");
    expect(out.categoryIds).toEqual(["a", "b", "c"]);
  });

  it("allows empty when primary is null", () => {
    expect(normalizeMembershipIds({ primaryId: null, categoryIds: [] })).toEqual({
      primaryId: null,
      categoryIds: [],
    });
  });

  it("rejects extras without primary", () => {
    expect(() =>
      normalizeMembershipIds({ primaryId: null, categoryIds: ["a"] }),
    ).toThrow(/Primary category is required/);
  });

  it("rejects more than max", () => {
    const ids = Array.from({ length: BUSINESS_CATEGORY_MEMBERSHIP_MAX + 1 }, (_, i) => `id-${i}`);
    expect(() =>
      normalizeMembershipIds({ primaryId: ids[0], categoryIds: ids }),
    ).toThrow(/At most/);
  });
});

describe("assertLeafCategoryIds", () => {
  it("rejects non-leaf ids", () => {
    expect(() => assertLeafCategoryIds(["x"], new Set(["a"]))).toThrow(/leaf/);
  });
});
