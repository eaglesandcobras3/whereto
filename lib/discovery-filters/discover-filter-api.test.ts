import { describe, expect, it } from "vitest";
import { buildDiscoverFilterApiUrl } from "@/lib/discovery-filters/discover-filter-api";

describe("buildDiscoverFilterApiUrl", () => {
  it("builds filter API URL from discover params", () => {
    expect(
      buildDiscoverFilterApiUrl({
        type: "storefront",
        town: "seaside,rosemary-beach",
        category: "restaurants",
        facet: "kid_friendly,outdoor_seating",
        page: "2",
      }),
    ).toBe(
      "/api/discovery/filter?type=storefront&town=seaside%2Crosemary-beach&category=restaurants&facet=kid_friendly%2Coutdoor_seating&page=2",
    );
  });

  it("returns base path when no params", () => {
    expect(buildDiscoverFilterApiUrl({})).toBe("/api/discovery/filter");
  });
});
