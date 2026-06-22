import { describe, expect, it } from "vitest";
import { normalizeBusinessCategorySlug } from "@/lib/search/category-slugs";

describe("normalizeBusinessCategorySlug", () => {
  it("maps coffee aliases to coffee_shops", () => {
    expect(normalizeBusinessCategorySlug("coffee")).toBe("coffee_shops");
    expect(normalizeBusinessCategorySlug("Coffee Shop")).toBe("coffee_shops");
    expect(normalizeBusinessCategorySlug("coffee-shops")).toBe("coffee_shops");
  });

  it("passes through canonical slugs", () => {
    expect(normalizeBusinessCategorySlug("restaurants")).toBe("restaurants");
    expect(normalizeBusinessCategorySlug("coffee_shops")).toBe("coffee_shops");
  });

  it("maps events and beaches aliases", () => {
    expect(normalizeBusinessCategorySlug("event")).toBe("events");
    expect(normalizeBusinessCategorySlug("beach")).toBe("beaches");
  });

  it("returns null for empty", () => {
    expect(normalizeBusinessCategorySlug("")).toBeNull();
    expect(normalizeBusinessCategorySlug(undefined)).toBeNull();
  });
});
