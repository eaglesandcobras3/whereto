import { describe, expect, it } from "vitest";
import {
  applyDiscoveryBrowseNav,
  discoveryHref,
  discoveryLinkRel,
  isDiscoveryEnabled,
} from "@/lib/nav/discovery-links";
import { BROWSE_NAV_ITEMS } from "@/lib/nav/browse-links";
import type { FeatureFlags } from "@/lib/feature-flags-core";

const askOn = { ask: true, search: true };
const allOff = { ask: false, search: false };
const discoverOnly: FeatureFlags = {
  ask: false,
  search: false,
  discover: true,
  search_inspector: false,
  onboard: false,
  guides: false,
};

describe("applyDiscoveryBrowseNav", () => {
  it("rewrites /search links to /ask but does not append an Ask nav item", () => {
    const items = applyDiscoveryBrowseNav(BROWSE_NAV_ITEMS, askOn);
    expect(items.some((i) => i.label === "Ask")).toBe(false);
    const services = items.find((i) => i.label === "Services");
    expect(services?.href).toBe("/services");
  });

  it("keeps Services activePaths for the vendor hub when Ask is on", () => {
    const items = applyDiscoveryBrowseNav(BROWSE_NAV_ITEMS, askOn);
    const services = items.find((i) => i.label === "Services");
    expect(services?.activePaths).toContain("/services");
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
    expect(discoveryLinkRel("/search?type=services")).toBe("nofollow");
    expect(discoveryLinkRel("/ask?q=foo")).toBe("nofollow");
    expect(discoveryLinkRel("/services")).toBeUndefined();
  });
});
