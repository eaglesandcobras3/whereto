import { describe, expect, it } from "vitest";
import { buildRelatedCategoriesByCategoryId } from "@/lib/categories/load-related-categories-by-id";
import {
  extraMembershipIds,
  mergeMembershipIds,
  suggestedExtraCategories,
} from "@/lib/categories/suggested-extra-categories";

const leaves = [
  { id: "primary", title: "Restaurant", groupTitle: "Food" },
  { id: "bar", title: "Bar", groupTitle: "Food" },
  { id: "catering", title: "Catering", groupTitle: "Food" },
  { id: "nightlife", title: "Nightlife", groupTitle: "Food" },
];

describe("suggestedExtraCategories", () => {
  it("suggests related leaves for primary and selected extras", () => {
    const related = {
      primary: ["bar", "catering"],
      bar: ["nightlife"],
    };
    const suggested = suggestedExtraCategories("primary", ["bar"], related, leaves);
    expect(suggested.map((l) => l.id)).toEqual(["catering", "nightlife"]);
  });

  it("excludes primary and already selected extras", () => {
    const related = { primary: ["bar"] };
    const suggested = suggestedExtraCategories("primary", ["bar"], related, leaves);
    expect(suggested).toHaveLength(0);
  });
});

describe("mergeMembershipIds", () => {
  it("keeps primary first and dedupes", () => {
    expect(mergeMembershipIds("primary", ["bar", "primary", "catering"])).toEqual([
      "primary",
      "bar",
      "catering",
    ]);
  });
});

describe("extraMembershipIds", () => {
  it("drops primary from membership list", () => {
    expect(extraMembershipIds("primary", ["primary", "bar"])).toEqual(["bar"]);
  });
});

describe("buildRelatedCategoriesByCategoryId", () => {
  it("groups and sorts related leaf ids per source", () => {
    const map = buildRelatedCategoriesByCategoryId([
      { category_id: "a", related_category_id: "c" },
      { category_id: "a", related_category_id: "b" },
      { category_id: "a", related_category_id: "a" },
    ]);
    expect(map).toEqual({ a: ["b", "c"] });
  });
});
