import { describe, expect, it } from "vitest";
import { applyDiscoveryBrowseNav, discoveryHref } from "@/lib/nav/discovery-links";
import { BROWSE_NAV_ITEMS } from "@/lib/nav/browse-links";

const askOn = { ask: true, search: true };

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
});
