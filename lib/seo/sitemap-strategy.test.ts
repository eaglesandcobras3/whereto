import { describe, expect, it } from "vitest";
import { categoryHubPath } from "@/lib/routes/category-hub-path";
import {
  PRIMARY_EDITORIAL_GUIDE_PATH,
  PRIMARY_EDITORIAL_GUIDE_SLUG,
  buildSitemapEntries,
  isExcludedSitemapPath,
  pathnameFromSitemapUrl,
  shouldIncludeGuideInSitemap,
  staticFallbackSitemap,
} from "@/lib/seo/sitemap-strategy";

const BASE = "https://whereto30a.com";

function urls(entries: { url: string }[]): string[] {
  return entries.map((e) => e.url);
}

function paths(entries: { url: string }[]): string[] {
  return entries.map((e) => pathnameFromSitemapUrl(BASE, e.url));
}

describe("sitemap strategy", () => {
  const sample = buildSitemapEntries({
    base: BASE,
    now: new Date("2026-06-01"),
    towns: [{ slug: "rosemary-beach" }, { slug: "seaside" }],
    guides: [
      { slug: PRIMARY_EDITORIAL_GUIDE_SLUG },
      { slug: "rosemary-beach" },
      { slug: "best-coffee-30a" },
    ],
    areas: [{ slug: "rosemary-beach-town-center" }],
    categories: [{ slug: "restaurants" }, { slug: "coffee_shops" }],
    pointsOfInterest: [{ slug: "rosemary-beach-town-center" }],
  });

  it("excludes business detail and utility paths", () => {
    const allPaths = paths(sample);
    expect(allPaths.some((p) => p.startsWith("/business/"))).toBe(false);
    expect(allPaths).not.toContain("/feedback");
    expect(allPaths).not.toContain("/list-your-business");
    expect(allPaths).not.toContain("/terms");
    expect(allPaths).not.toContain("/privacy");
    expect(allPaths).not.toContain("/about");
    expect(allPaths).not.toContain("/services");
  });

  it("includes hub pages and not standalone /guide", () => {
    const allPaths = paths(sample);
    expect(allPaths).toContain("/");
    expect(allPaths).toContain("/towns");
    expect(allPaths).toContain("/areas");
    expect(allPaths).toContain("/businesses");
    expect(allPaths).not.toContain("/categories");
    expect(allPaths).toContain("/guides");
    expect(allPaths).not.toContain("/guide");
    expect(allPaths).not.toContain("/stays");
    expect(allPaths).toContain(PRIMARY_EDITORIAL_GUIDE_PATH);
    expect(allPaths).toContain("/guide/best-coffee-30a");
  });

  it("includes /stays hub and rental URLs only when includeRentals is set", () => {
    const without = paths(
      buildSitemapEntries({
        base: BASE,
        now: new Date("2026-06-01"),
        towns: [],
        guides: [],
        areas: [],
        categories: [],
        rentals: [{ slug: "ocean-house" }],
        rentalTownHubs: [{ slug: "seaside" }],
      }),
    );
    expect(without).not.toContain("/stays");
    expect(without).not.toContain("/stays/ocean-house");
    expect(without).not.toContain("/stays/town/seaside");

    const withRentals = paths(
      buildSitemapEntries({
        base: BASE,
        now: new Date("2026-06-01"),
        towns: [],
        guides: [],
        areas: [],
        categories: [],
        includeRentals: true,
        rentals: [{ slug: "ocean-house" }],
        rentalTownHubs: [{ slug: "seaside" }],
      }),
    );
    expect(withRentals).toContain("/stays");
    expect(withRentals).toContain("/stays/ocean-house");
    expect(withRentals).toContain("/stays/town/seaside");
  });

  it("includes rollup browse groups (unified + legacy)", () => {
    const allPaths = paths(sample);
    expect(allPaths).toContain("/businesses/food-and-drink");
    expect(allPaths).toContain("/businesses/restaurants-and-bars");
    expect(allPaths).not.toContain("/services/home-trades");
  });

  it("includes towns, areas, categories, and non-duplicate guides", () => {
    const allPaths = paths(sample);
    expect(allPaths).toContain("/town/rosemary-beach");
    expect(allPaths).toContain("/town/seaside");
    expect(allPaths).toContain("/area/rosemary-beach-town-center");
    expect(allPaths).toContain("/businesses/restaurants");
    expect(allPaths).toContain("/guide/best-coffee-30a");
    expect(allPaths).not.toContain("/guide/rosemary-beach");
  });

  it("maps storefront services category slug away from /services hub", () => {
    const vendorAndStorefront = buildSitemapEntries({
      base: BASE,
      now: new Date("2026-06-01"),
      towns: [],
      guides: [],
      areas: [],
      categories: [{ slug: "services" }, { slug: "restaurants" }],
    });
    const allPaths = paths(vendorAndStorefront);
    expect(categoryHubPath("services")).toBe("/businesses/service-businesses");
    expect(allPaths).toContain("/businesses");
    expect(allPaths).toContain("/businesses/service-businesses");
    expect(allPaths).not.toContain("/services");
    expect(allPaths).not.toContain("/categories/services");
    expect(allPaths).not.toContain("/services-on-30a");
    expect(allPaths).not.toContain("/search");
  });

  it("dedupes POI URLs that share an area slug", () => {
    const areaUrls = urls(sample).filter((u) => u.includes("/area/rosemary-beach-town-center"));
    expect(areaUrls).toHaveLength(1);
  });

  it("assigns priority values", () => {
    const byPath = new Map(
      sample.map((e) => [pathnameFromSitemapUrl(BASE, e.url), e.priority]),
    );
    expect(byPath.get("/")).toBe(1.0);
    expect(byPath.get("/towns")).toBe(0.9);
    expect(byPath.get("/town/rosemary-beach")).toBe(0.85);
    expect(byPath.get(PRIMARY_EDITORIAL_GUIDE_PATH)).toBe(0.8);
    expect(byPath.get("/businesses/restaurants")).toBe(0.75);
    expect(byPath.get("/area/rosemary-beach-town-center")).toBe(0.7);
  });

  it("shouldIncludeGuideInSitemap drops town slug collisions", () => {
    const townSlugs = new Set(["rosemary-beach"]);
    expect(shouldIncludeGuideInSitemap("rosemary-beach", townSlugs)).toBe(false);
    expect(shouldIncludeGuideInSitemap("best-coffee-30a", townSlugs)).toBe(true);
  });

  it("static fallback includes primary editorial guide", () => {
    const fallback = staticFallbackSitemap(BASE, new Date());
    expect(paths(fallback)).toContain(PRIMARY_EDITORIAL_GUIDE_PATH);
    expect(paths(fallback)).not.toContain("/guide");
  });

  it("isExcludedSitemapPath guards business prefix", () => {
    expect(isExcludedSitemapPath("/business/foo")).toBe(true);
    expect(isExcludedSitemapPath("/guide/foo")).toBe(false);
  });
});
