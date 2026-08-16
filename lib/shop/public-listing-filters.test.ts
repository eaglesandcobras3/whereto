import { describe, expect, it } from "vitest";
import {
  DIRECTUS_PUBLISHED_STATUS,
  PUBLISHED_MEANS_INDEXABLE_TABLES,
} from "@/lib/shop/public-listing-filters";
import { isGuideEligibleForSitemap } from "@/lib/seo/sitemap-guide-eligibility";
import { isBusinessIndexReady } from "@/lib/seo/business-index-readiness";
import { isPublicRentalVisible, isRentalIndexReady } from "@/lib/stays/eligibility";

describe("published means indexable", () => {
  it("covers editorial and listing tables", () => {
    expect(PUBLISHED_MEANS_INDEXABLE_TABLES).toEqual([
      "towns",
      "areas",
      "guides",
      "businesses",
      "events",
      "points_of_interest",
    ]);
    expect(DIRECTUS_PUBLISHED_STATUS).toBe("published");
  });

  it("treats published guides as sitemap-eligible", () => {
    expect(isGuideEligibleForSitemap({ slug: "first-timers", status: "published" })).toBe(true);
  });

  it("does not gate business index readiness on soft-hide", () => {
    expect(
      isBusinessIndexReady({
        slug: "joes-pizza",
        excerpt: "A".repeat(80),
        address: "123 Main St",
        hero_image_url: "https://cdn.example.com/hero.jpg",
        primary_category_id: "cat-1",
        town_id: "town-1",
      }),
    ).toBe(true);
  });

  it("does not gate rental visibility on soft-hide", () => {
    expect(
      isPublicRentalVisible({
        status: "published",
        partner_status: "active",
      }),
    ).toBe(true);

    expect(
      isRentalIndexReady({
        slug: "ocean-view",
        status: "published",
        partner_status: "active",
        description: "x".repeat(90),
        hero_image_url: "https://cdn.example.com/a.jpg",
        town_id: "00000000-0000-0000-0000-000000000001",
        bedrooms: 3,
        bathrooms: 2,
        sleeps: 6,
        booking_url: "https://book.example.com/1",
        content_rights_confirmed: true,
      }),
    ).toBe(true);
  });
});
