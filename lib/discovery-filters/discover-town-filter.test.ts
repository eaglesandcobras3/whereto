import { describe, expect, it } from "vitest";
import { discoverTownFilterApplies } from "@/lib/discovery-filters/discover-town-filter";

describe("discoverTownFilterApplies", () => {
  it("is false for services", () => {
    expect(discoverTownFilterApplies("service")).toBe(false);
  });

  it("is true for storefronts", () => {
    expect(discoverTownFilterApplies("storefront")).toBe(true);
  });
});
