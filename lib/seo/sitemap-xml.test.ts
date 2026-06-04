import { describe, expect, it } from "vitest";
import { sitemapEntriesToXml } from "@/lib/seo/sitemap-xml";

describe("sitemapEntriesToXml", () => {
  it("emits valid urlset with escaped loc", () => {
    const xml = sitemapEntriesToXml([
      {
        url: "https://example.com/a&b",
        lastModified: new Date("2026-06-01T12:00:00.000Z"),
        changeFrequency: "weekly",
        priority: 0.8,
      },
    ]);
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain("<loc>https://example.com/a&amp;b</loc>");
    expect(xml).toContain("<changefreq>weekly</changefreq>");
    expect(xml).toContain("<priority>0.8</priority>");
  });
});
