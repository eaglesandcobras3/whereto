import { describe, expect, it } from "vitest";
import {
  PRIMARY_EDITORIAL_GUIDE_PATH,
  PRIMARY_EDITORIAL_GUIDE_SLUG,
  buildSitemapEntries,
} from "@/lib/seo/sitemap-strategy";
import {
  parseSitemapLocs,
  validateSitemapStructure,
} from "@/lib/seo/validate-sitemap-urls";

const BASE = "https://whereto30a.com";

describe("validateSitemapStructure", () => {
  it("passes for a well-formed hub sitemap", () => {
    const entries = buildSitemapEntries({
      base: BASE,
      now: new Date(),
      towns: [{ slug: "seaside" }],
      guides: [{ slug: PRIMARY_EDITORIAL_GUIDE_SLUG }, { slug: "best-beaches" }],
      areas: [{ slug: "seaside-town-center" }],
      categories: [{ slug: "restaurants" }],
    });
    const urls = entries.map((e) => e.url);
    expect(validateSitemapStructure(BASE, urls)).toEqual([]);
  });

  it("fails when business URLs are present", () => {
    const violations = validateSitemapStructure(BASE, [
      `${BASE}/`,
      `${BASE}/business/foo`,
    ]);
    expect(violations.some((v) => v.rule === "no-business-urls")).toBe(true);
  });

  it("fails on legacy granular /categories/[slug] but allows rollup groups", () => {
    const entries = buildSitemapEntries({
      base: BASE,
      now: new Date(),
      towns: [{ slug: "seaside" }],
      guides: [{ slug: PRIMARY_EDITORIAL_GUIDE_SLUG }],
      areas: [{ slug: "seaside-town-center" }],
      categories: [{ slug: "restaurants" }],
    });
    const hubUrls = entries.map((e) => e.url);
    expect(validateSitemapStructure(BASE, hubUrls)).toEqual([]);

    const legacyViolations = validateSitemapStructure(BASE, [
      ...hubUrls,
      `${BASE}/categories/restaurants`,
    ]);
    expect(legacyViolations.some((v) => v.rule === "no-legacy-category-urls")).toBe(true);
  });

  it("fails when standalone /guide is present", () => {
    const violations = validateSitemapStructure(BASE, [
      `${BASE}/`,
      `${BASE}/guide`,
      `${BASE}${PRIMARY_EDITORIAL_GUIDE_PATH}`,
      `${BASE}/guides`,
      `${BASE}/towns`,
      `${BASE}/areas`,
      `${BASE}/businesses`,
      `${BASE}/town/seaside`,
      `${BASE}/area/x`,
      `${BASE}/restaurants`,
    ]);
    expect(violations.some((v) => v.rule === "no-standalone-guide")).toBe(true);
  });

  it("skips guide rules when no guide URLs are present", () => {
    const violations = validateSitemapStructure(BASE, [
      `${BASE}/`,
      `${BASE}/towns`,
      `${BASE}/areas`,
      `${BASE}/businesses`,
      `${BASE}/town/seaside`,
      `${BASE}/area/x`,
      `${BASE}/restaurants`,
    ]);
    expect(violations.some((v) => v.rule === "guides-hub")).toBe(false);
    expect(violations.some((v) => v.rule === "primary-editorial-guide")).toBe(false);
  });
});

describe("parseSitemapLocs", () => {
  it("extracts loc elements from XML", () => {
    const xml = `<?xml version="1.0"?>
    <urlset>
      <url><loc>${BASE}/</loc></url>
      <url><loc>${BASE}/guides</loc></url>
    </urlset>`;
    expect(parseSitemapLocs(xml)).toEqual([`${BASE}/`, `${BASE}/guides`]);
  });
});
