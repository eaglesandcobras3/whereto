import { describe, expect, it } from "vitest";
import { rowMatchesSearchTags } from "@/lib/discovery-filters/compile-filter-query";
import { validateFilterContract } from "@/lib/discovery-filters/filter-contract";
import { parseDiscoveryFilterState, parseEntityType, constrainTagsToScope } from "@/lib/discovery-filters/parse-filter-params";
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
    expect(normalizeServiceCategoryGroupSlug("marketing_creative")).toBe("creative_events");
    expect(normalizeServiceCategoryGroupSlug("creative_events")).toBe("creative_events");
  });

  it("drops the retired marine_auto_more catch-all", () => {
    expect(normalizeServiceCategoryGroupSlug("marine_auto_more")).toBeUndefined();
  });
});

describe("parseDiscoveryFilterState", () => {
  it("parses storefront scope with rollup category and tags", () => {
    const state = parseDiscoveryFilterState({
      type: "storefront",
      category: "shopping",
      facet: "kids",
    }, ["00000000-0000-4000-8000-000000000001"]);
    expect(state.entity_type).toBe("storefront");
    expect(state.category_slug).toBe("shopping");
    expect(state.tags).toEqual(["kids"]);
    expect(state.town_ids).toEqual(["00000000-0000-4000-8000-000000000001"]);
  });

  it("parses multiple tags from facet", () => {
    const state = parseDiscoveryFilterState({
      type: "storefront",
      category: "coffee_and_treats",
      facet: "gluten_free,donuts",
      town: "rosemary-beach",
    });
    expect(state.tags).toEqual(["gluten_free", "donuts"]);
  });

  it("merges legacy facet_any into tags", () => {
    const state = parseDiscoveryFilterState({
      type: "storefront",
      category: "coffee_and_treats",
      facet: "gluten_free",
      facet_any: "donuts",
      town: "rosemary-beach",
    });
    expect(state.tags).toEqual(["gluten_free", "donuts"]);
  });

  it("dedupes tags across facet and facet_any", () => {
    const state = parseDiscoveryFilterState({
      type: "storefront",
      facet: "gluten_free",
      facet_any: "gluten_free,donuts",
    });
    expect(state.tags).toEqual(["gluten_free", "donuts"]);
  });
});

describe("constrainTagsToScope", () => {
  it("removes tag selections outside the scoped vocabulary", () => {
    const state = parseDiscoveryFilterState({
      type: "storefront",
      facet: "gluten_free,donuts",
      facet_any: "coffee",
    });
    const constrained = constrainTagsToScope(state, ["gluten_free", "coffee"]);
    expect(constrained.tags).toEqual(["gluten_free", "coffee"]);
  });
});

describe("validateFilterContract", () => {
  it("rejects category on service listings", () => {
    const errors = validateFilterContract({
      entity_type: "service",
      town_ids: [],
      anchor_town_ids: [],
      category_slug: "restaurants_and_bars",
      tags: [],
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
  it("matches when at least one selected tag is present", () => {
    expect(rowMatchesSearchTags(["gluten_free", "donuts", "coffee"], ["gluten_free", "donuts"])).toBe(
      true,
    );
    expect(rowMatchesSearchTags(["gluten_free"], ["gluten_free", "donuts"])).toBe(true);
    expect(rowMatchesSearchTags(["coffee"], ["gluten_free", "donuts"])).toBe(false);
  });
});
