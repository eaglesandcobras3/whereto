import { describe, expect, it } from "vitest";
import { buildSearchDocumentFields, deriveSearchTags } from "@/lib/search/derive-search-document";

describe("derive-search-document", () => {
  it("merges tag arrays and infers coffee from business_type", () => {
    const tags = deriveSearchTags({
      title: "Morning Brew",
      excerpt: null,
      business_type: "coffee shop",
      search_keywords: null,
      item_tags: ["pastries"],
      dietary_tags: null,
      atmosphere_tags: null,
      occasion_tags: null,
      meal_period_tags: null,
    });
    expect(tags).toContain("pastries");
    expect(tags).toContain("coffee");
  });

  it("builds search_terms and embedding_summary", () => {
    const doc = buildSearchDocumentFields({
      title: "Amavida",
      excerpt: "Waterfront coffee.",
      business_type: "coffee shop",
      search_keywords: "coffee seaside",
      item_tags: ["latte"],
    });
    expect(doc.search_terms).toContain("coffee");
    expect(doc.embedding_summary).toMatch(/Amavida/);
    expect(doc.search_tags).toContain("latte");
  });
});
