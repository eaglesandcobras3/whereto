import { describe, expect, it } from "vitest";
import { BUSINESS_INDEX_MIN_UNIQUE_TEXT } from "@/lib/seo/business-index-readiness";
import { buildBusinessSitemapEntries } from "@/lib/seo/fetch-sitemap-business-entries";

const BASE = "https://whereto30a.com";

describe("buildBusinessSitemapEntries", () => {
  const ready = {
    slug: "joes-pizza",
    excerpt: "A".repeat(BUSINESS_INDEX_MIN_UNIQUE_TEXT),
    address: "123 Main St",
    hero_image_url: "https://cdn.example.com/hero.jpg",
    primary_category_id: "cat-1",
    town_id: "town-1",
    is_hidden_from_search: false,
    date_updated: "2026-06-01T00:00:00.000Z",
  };

  it("includes only index-ready businesses", () => {
    const entries = buildBusinessSitemapEntries({
      base: BASE,
      now: new Date("2026-06-15"),
      businesses: [
        ready,
        { ...ready, slug: "thin-listing", excerpt: "short" },
        { ...ready, slug: "hidden-listing", is_hidden_from_search: true },
      ],
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.url).toBe(`${BASE}/business/joes-pizza`);
    expect(entries[0]?.priority).toBe(0.6);
    expect(entries[0]?.changeFrequency).toBe("weekly");
  });
});
