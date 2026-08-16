import { describe, expect, it } from "vitest";
import {
  LEGACY_BROWSE_GROUP_REDIRECTS,
  legacyBrowseGroupRedirectDestination,
} from "@/lib/seo/legacy-browse-group-redirects";

describe("legacy browse group redirects", () => {
  it("maps overlapping legacy hubs to unified rollups", () => {
    expect(legacyBrowseGroupRedirectDestination("/businesses/restaurants-and-bars")).toBe(
      "/businesses/food-and-drink",
    );
    expect(legacyBrowseGroupRedirectDestination("/businesses/health-and-medical")).toBe(
      "/businesses/medical",
    );
    expect(legacyBrowseGroupRedirectDestination("/businesses/professional-and-financial")).toBe(
      "/businesses/professional",
    );
    expect(legacyBrowseGroupRedirectDestination("/businesses/coffee-and-treats")).toBe(
      "/businesses/food-and-drink",
    );
  });

  it("does not redirect shared unified segments", () => {
    expect(legacyBrowseGroupRedirectDestination("/businesses/shopping")).toBeNull();
    expect(legacyBrowseGroupRedirectDestination("/businesses/food-and-drink")).toBeNull();
  });

  it("keeps redirect list permanent-source paths unique", () => {
    const sources = LEGACY_BROWSE_GROUP_REDIRECTS.map((r) => r.source);
    expect(new Set(sources).size).toBe(sources.length);
  });
});
