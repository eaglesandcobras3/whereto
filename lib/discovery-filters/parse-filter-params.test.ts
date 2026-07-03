import { describe, expect, it } from "vitest";
import { rowMatchesSearchTags } from "@/lib/discovery-filters/compile-filter-query";
import { validateFilterContract } from "@/lib/discovery-filters/filter-contract";
import { parseDiscoveryFilterState, parseEntityType } from "@/lib/discovery-filters/parse-filter-params";
import { parseTagSlugsFromParam } from "@/lib/discovery-filters/parse-tag-params";
import {
  normalizeServiceCategoryGroupSlug,
  normalizeStorefrontCategoryGroupSlug,
} from "@/lib/discovery-filters/category-group-slugs";

describe("parseEntityType", () => {
  it("maps services to service entity type", () => {
    expect(parseEntityType("services")).toBe("service");
    expect(parseEntityType("storefront")).toBe("storefront");
  });
});

describe("normalizeStorefrontCategoryGroupSlug", () => {
  it("accepts rollup group slugs", () => {
    expect(normalizeStorefrontCategoryGroupSlug("restaurants_and_bars")).toBe("restaurants_and_bars");
    expect(normalizeStorefrontCategoryGroupSlug("shopping")).toBe("shopping");
  });

  it("maps granular slugs to rollup groups", () => {
    expect(normalizeStorefrontCategoryGroupSlug("restaurants")).toBe("restaurants_and_bars");
    expect(normalizeStorefrontCategoryGroupSlug("boutiques")).toBe("shopping");
  });
});

describe("normalizeServiceCategoryGroupSlug", () => {
  it("maps specialty slugs to service groups", () => {
    expect(normalizeServiceCategoryGroupSlug("plumbing")).toBe("home_trades");
    expect(normalizeServiceCategoryGroupSlug("home_trades")).toBe("home_trades");
  });
});

describe("parseDiscoveryFilterState", () => {
  it("parses storefront scope with rollup category and required tags", () => {
    const state = parseDiscoveryFilterState({
      type: "storefront",
      category: "shopping",
      facet: "kids",
      town_id: "00000000-0000-4000-8000-000000000001",
    });
    expect(state.entity_type).toBe("storefront");
    expect(state.category_slug).toBe("shopping");
    expect(state.tags_required).toEqual(["kids"]);
    expect(state.tags_any).toEqual([]);
  });

  it("parses multiple required tags as AND filters", () => {
    const state = parseDiscoveryFilterState({
      type: "storefront",
      category: "coffee_and_treats",
      facet: "gluten_free,donuts",
      town: "rosemary-beach",
    });
    expect(state.tags_required).toEqual(["gluten_free", "donuts"]);
    expect(state.tags_any).toEqual([]);
  });

  it("parses optional facet_any tags separately", () => {
    const state = parseDiscoveryFilterState({
      type: "storefront",
      category: "coffee_and_treats",
      facet: "gluten_free",
      facet_any: "donuts",
      town: "rosemary-beach",
    });
    expect(state.tags_required).toEqual(["gluten_free"]);
    expect(state.tags_any).toEqual(["donuts"]);
  });

  it("drops optional tags that duplicate required tags", () => {
    const state = parseDiscoveryFilterState({
      type: "storefront",
      facet: "gluten_free",
      facet_any: "gluten_free,donuts",
    });
    expect(state.tags_required).toEqual(["gluten_free"]);
    expect(state.tags_any).toEqual(["donuts"]);
  });
});

describe("validateFilterContract", () => {
  it("rejects category on service listings", () => {
    const errors = validateFilterContract({
      entity_type: "service",
      category_slug: "restaurants_and_bars",
      tags_required: [],
      tags_any: [],
      page: 1,
      page_size: 24,
    });
    expect(errors.some((e) => e.code === "category_on_service")).toBe(true);
  });
});

describe("parseTagSlugsFromParam", () => {
  it("parses comma-separated slugs", () => {
    expect(parseTagSlugsFromParam("gluten_free,donuts")).toEqual(["gluten_free", "donuts"]);
  });

  it("strips legacy family prefixes", () => {
    expect(parseTagSlugsFromParam("item_tags:kids")).toEqual(["kids"]);
  });
});

describe("rowMatchesSearchTags", () => {
  it("requires all selected tags (AND)", () => {
    expect(rowMatchesSearchTags(["gluten_free", "donuts", "coffee"], ["gluten_free", "donuts"])).toBe(
      true,
    );
    expect(rowMatchesSearchTags(["gluten_free"], ["gluten_free", "donuts"])).toBe(false);
  });
});
