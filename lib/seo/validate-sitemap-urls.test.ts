import { describe, expect, it } from "vitest";
import {
  PRIMARY_EDITORIAL_GUIDE_PATH,
  PRIMARY_EDITORIAL_GUIDE_SLUG,
  SITEMAP_BUSINESSES_PATH,
  SITEMAP_HUBS_PATH,
  buildSitemapEntries,
} from "@/lib/seo/sitemap-strategy";
import {
  parseSitemapLocs,
  validateAllSitemapPageUrls,
  validateBusinessSitemapStructure,
  validateSitemapIndexStructure,
  validateSitemapStructure,
} from "@/lib/seo/validate-sitemap-urls";

const BASE = "https://whereto30a.com";

describe("validateSitemapStructure", () => {
  it("passes for a well-formed index sitemap", () => {
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

  it("fails when standalone /guide is present", () => {
    const violations = validateSitemapStructure(BASE, [
      `${BASE}/`,
      `${BASE}/guide`,
      `${BASE}${PRIMARY_EDITORIAL_GUIDE_PATH}`,
      `${BASE}/guides`,
      `${BASE}/towns`,
      `${BASE}/areas`,
      `${BASE}/categories`,
      `${BASE}/services`,
      `${BASE}/seaside`,
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
      `${BASE}/categories`,
      `${BASE}/services`,
      `${BASE}/seaside`,
      `${BASE}/area/x`,
      `${BASE}/restaurants`,
    ]);
    expect(violations.some((v) => v.rule === "guides-hub")).toBe(false);
    expect(violations.some((v) => v.rule === "primary-editorial-guide")).toBe(false);
  });

  it("passes business URLs in validateAllSitemapPageUrls when partitioned", () => {
    const hubEntries = buildSitemapEntries({
      base: BASE,
      now: new Date(),
      towns: [{ slug: "seaside" }],
      guides: [{ slug: PRIMARY_EDITORIAL_GUIDE_SLUG }],
      areas: [{ slug: "seaside-town-center" }],
      categories: [{ slug: "restaurants" }],
    });
    const urls = [
      ...hubEntries.map((e) => e.url),
      `${BASE}/business/joes-pizza`,
    ];
    expect(validateAllSitemapPageUrls(BASE, urls)).toEqual([]);
  });
});

describe("validateBusinessSitemapStructure", () => {
  it("accepts only business URLs", () => {
    expect(
      validateBusinessSitemapStructure(BASE, [`${BASE}/business/foo`]),
    ).toEqual([]);
  });

  it("rejects hub URLs", () => {
    const violations = validateBusinessSitemapStructure(BASE, [`${BASE}/restaurants`]);
    expect(violations.some((v) => v.rule === "business-sitemap-only-business-urls")).toBe(true);
  });
});

describe("validateSitemapIndexStructure", () => {
  it("requires hub and business child sitemaps", () => {
    expect(
      validateSitemapIndexStructure(BASE, [
        `${BASE}${SITEMAP_HUBS_PATH}`,
        `${BASE}${SITEMAP_BUSINESSES_PATH}`,
      ]),
    ).toEqual([]);
  });

  it("fails when a child sitemap is missing", () => {
    const violations = validateSitemapIndexStructure(BASE, [`${BASE}${SITEMAP_HUBS_PATH}`]);
    expect(violations.some((v) => v.rule === "sitemap-index-businesses")).toBe(true);
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
