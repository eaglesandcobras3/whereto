import { describe, expect, it } from "vitest";
import { resolvePrefillCategory } from "@/lib/listing-requests/resolve-prefill-category";

describe("resolvePrefillCategory", () => {
  it("prefills a leaf category with titles", () => {
    expect(
      resolvePrefillCategory({
        primary_category_id: "leaf-1",
        category: {
          id: "leaf-1",
          title: "Coffee shops",
          parent_category_id: "rollup-1",
          parent_title: "Food & Drink",
        },
      }),
    ).toEqual({
      category_id: "leaf-1",
      category_title: "Coffee shops",
      category_group_title: "Food & Drink",
    });
  });

  it("does not prefill a rollup parent as the form category", () => {
    expect(
      resolvePrefillCategory({
        primary_category_id: "rollup-1",
        category: {
          id: "rollup-1",
          title: "Food & Drink",
          parent_category_id: null,
        },
      }),
    ).toEqual({
      category_id: null,
      category_title: null,
      category_group_title: null,
    });
  });

  it("keeps primary id when embed is missing so the form can resolve from options", () => {
    expect(
      resolvePrefillCategory({
        primary_category_id: "leaf-2",
        category: null,
      }),
    ).toEqual({
      category_id: "leaf-2",
      category_title: null,
      category_group_title: null,
    });
  });

  it("returns empty when nothing is set", () => {
    expect(resolvePrefillCategory({})).toEqual({
      category_id: null,
      category_title: null,
      category_group_title: null,
    });
  });
});
