import { describe, expect, it } from "vitest";
import { validateFilterContract } from "@/lib/discovery-filters/filter-contract";
import { parseDiscoveryFilterState, parseEntityType } from "@/lib/discovery-filters/parse-filter-params";
import { parseFacetParamTokens } from "@/lib/discovery-filters/facet-allowlists";
import { buildFacetOrFilter } from "@/lib/discovery-filters/compile-filter-query";
import {
  normalizeServiceCategoryGroupSlug,
  normalizeStorefrontCategoryGroupSlug,
} from "@/lib/discovery-filters/resolve-category-groups";

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
  it("parses storefront scope with rollup category and facets", () => {
    const state = parseDiscoveryFilterState({
      type: "storefront",
      category: "shopping",
      facet: "kids",
      town_id: "00000000-0000-4000-8000-000000000001",
    });
    expect(state.entity_type).toBe("storefront");
    expect(state.category_slug).toBe("shopping");
    expect(state.facet_tags).toEqual([{ family: "item_tags", slug: "kids" }]);
  });

  it("normalizes granular restaurant category to rollup group", () => {
    const state = parseDiscoveryFilterState({
      type: "storefront",
      category: "restaurants",
      facet: "hamburgers",
    });
    expect(state.category_slug).toBe("restaurants_and_bars");
    expect(state.facet_tags).toEqual([{ family: "item_tags", slug: "hamburgers" }]);
  });
});

describe("validateFilterContract", () => {
  it("rejects category on service listings", () => {
    const errors = validateFilterContract({
      entity_type: "service",
      category_slug: "restaurants_and_bars",
      facet_tags: [],
      page: 1,
      page_size: 24,
    });
    expect(errors.some((e) => e.code === "category_on_service")).toBe(true);
  });
});

describe("buildFacetOrFilter", () => {
  it("builds postgrest or clause for facets", () => {
    expect(
      buildFacetOrFilter([
        { family: "item_tags", slug: "kids" },
        { family: "item_tags", slug: "hamburgers" },
      ]),
    ).toBe("item_tags.cs.{kids},item_tags.cs.{hamburgers}");
  });
});

describe("parseFacetParamTokens", () => {
  it("parses family:slug tokens", () => {
    expect(
      parseFacetParamTokens("item_tags:kids", "shopping", undefined, "storefront"),
    ).toEqual([{ family: "item_tags", slug: "kids" }]);
  });

  it("resolves facets against rollup category groups", () => {
    expect(
      parseFacetParamTokens("hamburgers", "restaurants_and_bars", undefined, "storefront"),
    ).toEqual([{ family: "item_tags", slug: "hamburgers" }]);
  });
});
