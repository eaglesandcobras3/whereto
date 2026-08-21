import { describe, expect, it } from "vitest";
import {
  applyDiscoveryBrowseNav,
  discoverHref,
  discoveryHref,
  discoveryLinkRel,
  isDiscoveryEnabled,
  showNavbarDiscoverQueryUi,
} from "@/lib/nav/discovery-links";
import { BROWSE_NAV_ITEMS } from "@/lib/nav/browse-links";
import type { FeatureFlags } from "@/lib/feature-flags-core";

const askOn = { ask: true, search: false };
const allOff = { ask: false, search: false };
const discoverOnly: FeatureFlags = {
  ask: false,
  search: false,
  discover: true,
  discover_nl: false,
  discover_maps: false,
  search_inspector: false,
  onboard: false,
  community_tips: false,
  area_facts: true,
  rentals: false,
  rental_partners: false,
  business_photos: false,
  admin_business_direct_edit: false,
  business_maps: false,
  town_maps: false,
  town_relationship: false,
  multiple_category: false,
  feedback: false,
  category_hub_seo: false,
};
const discoverNlOn: FeatureFlags = {
  ...discoverOnly,
  discover_nl: true,
};

describe("applyDiscoveryBrowseNav", () => {
  it("rewrites /search links to /ask but does not append an Ask nav item", () => {
    const items = applyDiscoveryBrowseNav(BROWSE_NAV_ITEMS, askOn);
    expect(items.some((i) => i.label === "Ask")).toBe(false);
    const businesses = items.find((i) => i.label === "Businesses");
    expect(businesses?.href).toBe("/businesses");
  });

  it("keeps Businesses active for former /services paths when Ask is on", () => {
    const items = applyDiscoveryBrowseNav(BROWSE_NAV_ITEMS, askOn);
    const businesses = items.find((i) => i.label === "Businesses");
    expect(businesses?.activePaths).toContain("/services");
  });

  it("rewrites Businesses to /discover when discover is on", () => {
    const items = applyDiscoveryBrowseNav(BROWSE_NAV_ITEMS, discoverOnly);
    const businesses = items.find((i) => i.label === "Businesses");
    expect(businesses?.href).toBe("/discover");
    expect(businesses?.activePaths).toContain("/discover");
    expect(businesses?.activePaths).not.toContain("/businesses");
  });

  it("inserts Categories pointing at /businesses when discover is on", () => {
    const items = applyDiscoveryBrowseNav(BROWSE_NAV_ITEMS, discoverOnly);
    const categories = items.find((i) => i.label === "Categories");
    expect(categories?.href).toBe("/businesses");
    expect(categories?.activePaths).toContain("/businesses");
    const businessesIdx = items.findIndex((i) => i.label === "Businesses");
    const categoriesIdx = items.findIndex((i) => i.label === "Categories");
    expect(categoriesIdx).toBe(businessesIdx + 1);
  });

  it("keeps Businesses on /businesses when discover is off", () => {
    const items = applyDiscoveryBrowseNav(BROWSE_NAV_ITEMS, allOff);
    const businesses = items.find((i) => i.label === "Businesses");
    expect(businesses?.href).toBe("/businesses");
    expect(items.some((i) => i.label === "Categories")).toBe(false);
  });
});

describe("discoveryHref", () => {
  it("returns /ask when ask flag is on", () => {
    expect(discoveryHref(askOn)).toBe("/ask");
    expect(discoveryHref(askOn, { q: "coffee" })).toBe("/ask?q=coffee");
  });

  it("returns / when both discovery flags are off", () => {
    expect(discoveryHref(allOff)).toBe("/");
    expect(discoveryHref(allOff, { q: "coffee" })).toBe("/");
  });
});

describe("isDiscoveryEnabled", () => {
  it("is false when search, ask, and discover are off", () => {
    expect(isDiscoveryEnabled(allOff)).toBe(false);
  });

  it("is true when discover is on", () => {
    expect(isDiscoveryEnabled(discoverOnly)).toBe(true);
  });
});

describe("discoveryLinkRel", () => {
  it("marks robots-disallowed discovery URLs as nofollow", () => {
    expect(discoveryLinkRel("/ask?q=foo")).toBe("nofollow");
    expect(discoveryLinkRel("/discover?q=coffee")).toBe("nofollow");
    expect(discoveryLinkRel("/businesses")).toBeUndefined();
  });
});

describe("showNavbarDiscoverQueryUi", () => {
  it("is false when discover is on but discover_nl is off", () => {
    expect(showNavbarDiscoverQueryUi(discoverOnly)).toBe(false);
  });

  it("is true when discover_nl is on and ask is off", () => {
    expect(showNavbarDiscoverQueryUi(discoverNlOn)).toBe(true);
  });

  it("is false when ask is on", () => {
    expect(showNavbarDiscoverQueryUi({ ...discoverNlOn, ask: true })).toBe(false);
  });
});

describe("discoverHref with discover_nl", () => {
  it("passes raw q when discover_nl is off", () => {
    expect(discoverHref(discoverOnly, { q: "kid friendly lunch near seaside" })).toBe(
      "/discover?q=kid+friendly+lunch+near+seaside",
    );
  });

  it("passes raw q when discover_nl is on (server expands on /discover)", () => {
    expect(discoverHref(discoverNlOn, { q: "kid friendly lunch near seaside" })).toBe(
      "/discover?q=kid+friendly+lunch+near+seaside",
    );
  });

  it("does not expand when explicit filters are already present", () => {
    expect(
      discoverHref(discoverNlOn, { q: "coffee", town: "seaside" }),
    ).toBe("/discover?town=seaside&q=coffee");
  });
});
