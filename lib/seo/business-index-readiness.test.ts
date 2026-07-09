import { describe, expect, it } from "vitest";
import {
  BUSINESS_INDEX_MIN_UNIQUE_TEXT,
  businessSitemapPath,
  hasBusinessListingImage,
  isBusinessIndexReady,
} from "@/lib/seo/business-index-readiness";

describe("isBusinessIndexReady", () => {
  const ready = {
    slug: "joes-pizza",
    excerpt: "A".repeat(BUSINESS_INDEX_MIN_UNIQUE_TEXT),
    address: "123 Main St",
    hero_image_url: "https://cdn.example.com/hero.jpg",
    primary_category_id: "cat-1",
    town_id: "town-1",
    is_hidden_from_search: false,
  };

  it("returns true when all fields are present", () => {
    expect(isBusinessIndexReady(ready)).toBe(true);
  });

  it("returns false when text is too short", () => {
    expect(isBusinessIndexReady({ ...ready, excerpt: "short", content: null })).toBe(false);
  });

  it("returns false when hidden from search", () => {
    expect(isBusinessIndexReady({ ...ready, is_hidden_from_search: true })).toBe(false);
  });

  it("returns false without slug", () => {
    expect(isBusinessIndexReady({ ...ready, slug: "" })).toBe(false);
  });
});

describe("hasBusinessListingImage", () => {
  it("accepts hero_image_url", () => {
    expect(hasBusinessListingImage({ hero_image_url: "https://x/y.jpg" })).toBe(true);
  });

  it("rejects empty image fields", () => {
    expect(hasBusinessListingImage({})).toBe(false);
  });
});

describe("businessSitemapPath", () => {
  it("encodes slug in path", () => {
    expect(businessSitemapPath("joes pizza")).toBe("/business/joes%20pizza");
  });
});
