import { describe, expect, it } from "vitest";
import { expandCorridorTownSlugsForNearSearch } from "@/lib/discovery-filters/corridor-town-scope";

describe("expandCorridorTownSlugsForNearSearch", () => {
  it("expands eastern anchors through Seaside", () => {
    const result = expandCorridorTownSlugsForNearSearch(["rosemary-beach"]);
    expect(result.searchAllTowns).toBe(false);
    expect(result.slugs).toContain("rosemary-beach");
    expect(result.slugs).toContain("seaside");
    expect(result.slugs).not.toContain("grayton-beach");
  });

  it("expands western anchors from Grayton westward", () => {
    const result = expandCorridorTownSlugsForNearSearch(["blue-mountain-beach"]);
    expect(result.searchAllTowns).toBe(false);
    expect(result.slugs).toContain("grayton-beach");
    expect(result.slugs).toContain("blue-mountain-beach");
    expect(result.slugs).not.toContain("rosemary-beach");
  });

  it("searches all towns for central anchors", () => {
    const result = expandCorridorTownSlugsForNearSearch(["seagrove-beach"]);
    expect(result.searchAllTowns).toBe(true);
    expect(result.slugs).toEqual([]);
  });

  it("keeps unknown slugs as-is", () => {
    const result = expandCorridorTownSlugsForNearSearch(["destin"]);
    expect(result.searchAllTowns).toBe(false);
    expect(result.slugs).toEqual(["destin"]);
  });
});
