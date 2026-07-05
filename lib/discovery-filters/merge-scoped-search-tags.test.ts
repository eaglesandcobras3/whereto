import { describe, expect, it } from "vitest";
import {
  appliedTagsFromFilters,
  mergeActiveTagsIntoScopedOptions,
} from "@/lib/discovery-filters/merge-scoped-search-tags";

describe("mergeActiveTagsIntoScopedOptions", () => {
  it("appends active tags missing from scoped picker options", () => {
    const merged = mergeActiveTagsIntoScopedOptions(
      [{ slug: "coffee", label: "Coffee", count: 3 }],
      ["coffee", "kid_friendly", "lunch"],
    );
    expect(merged.map((tag) => tag.slug)).toEqual(["coffee", "kid_friendly", "lunch"]);
    expect(merged.find((tag) => tag.slug === "kid_friendly")?.count).toBe(0);
  });
});

describe("appliedTagsFromFilters", () => {
  it("reads tag slugs from applied_filters", () => {
    expect(
      appliedTagsFromFilters({ tags: ["kid_friendly", "lunch"], entity_type: "storefront" }),
    ).toEqual(["kid_friendly", "lunch"]);
  });
});
