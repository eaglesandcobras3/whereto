import { describe, expect, it } from "vitest";
import { validateFilterContract } from "@/lib/discovery-filters/filter-contract";
import { parseDiscoveryFilterState, parseEntityType } from "@/lib/discovery-filters/parse-filter-params";
import { parseFacetParamTokens } from "@/lib/discovery-filters/facet-allowlists";
import { buildFacetOrFilter } from "@/lib/discovery-filters/compile-filter-query";

describe("parseEntityType", () => {
  it("maps services to service entity type", () => {
    expect(parseEntityType("services")).toBe("service");
    expect(parseEntityType("storefront")).toBe("storefront");
  });
});

describe("parseDiscoveryFilterState", () => {
  it("parses storefront scope with category and facets", () => {
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

  it("parses restaurant hamburgers facet", () => {
    const state = parseDiscoveryFilterState({
      type: "storefront",
      category: "restaurants",
      facet: "hamburgers",
    });
    expect(state.facet_tags).toEqual([{ family: "item_tags", slug: "hamburgers" }]);
  });
});

describe("validateFilterContract", () => {
  it("rejects category on service listings", () => {
    const errors = validateFilterContract({
      entity_type: "service",
      category_slug: "restaurants",
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
});
