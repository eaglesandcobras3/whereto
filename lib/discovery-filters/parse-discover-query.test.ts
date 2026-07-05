import { describe, expect, it } from "vitest";
import { parseDiscoverQuery } from "@/lib/discovery-filters/parse-discover-query";

describe("parseDiscoverQuery", () => {
  it("expands kid friendly lunch near seaside into town, category, and tags", () => {
    const parsed = parseDiscoverQuery("kid friendly lunch near seaside");
    expect(parsed.expanded).toBe(true);
    expect(parsed.town).toBe("seaside");
    expect(parsed.type).toBe("storefront");
    expect(parsed.category).toBe("restaurants_and_bars");
    expect(parsed.facet?.split(",")).toContain("kid_friendly");
    expect(parsed.facet?.split(",")).toContain("lunch");
  });

  it("routes coffee to coffee_and_treats rollup", () => {
    const parsed = parseDiscoverQuery("coffee");
    expect(parsed.expanded).toBe(true);
    expect(parsed.category).toBe("coffee_and_treats");
    expect(parsed.type).toBe("storefront");
  });

  it("extracts town from rosemary beach coffee query", () => {
    const parsed = parseDiscoverQuery("coffee in rosemary beach");
    expect(parsed.expanded).toBe(true);
    expect(parsed.town).toBe("rosemary-beach");
    expect(parsed.category).toBe("coffee_and_treats");
  });

  it("routes golf carts to things_to_do with mobility tag", () => {
    const parsed = parseDiscoverQuery("golf cart rental");
    expect(parsed.expanded).toBe(true);
    expect(parsed.category).toBe("things_to_do");
    expect(parsed.facet).toContain("mobility_rental");
  });

  it("routes plumber to services", () => {
    const parsed = parseDiscoverQuery("plumber near grayton");
    expect(parsed.expanded).toBe(true);
    expect(parsed.type).toBe("services");
    expect(parsed.town).toBe("grayton-beach");
  });

  it("passes through unrecognized queries without expansion", () => {
    const parsed = parseDiscoverQuery("xyzzy unknown place");
    expect(parsed.expanded).toBe(false);
    expect(parsed.q).toBe("xyzzy unknown place");
  });

  it("extracts gluten free dietary tag", () => {
    const parsed = parseDiscoverQuery("gluten free restaurants");
    expect(parsed.expanded).toBe(true);
    expect(parsed.facet).toContain("gluten_free");
    expect(parsed.category).toBe("restaurants_and_bars");
  });

  it("expands froyo to coffee_and_treats via alias fast path", () => {
    const parsed = parseDiscoverQuery("froyo near seaside");
    expect(parsed.expanded).toBe(true);
    expect(parsed.category).toBe("coffee_and_treats");
    expect(parsed.town).toBe("seaside");
  });
});
