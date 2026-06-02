import { describe, expect, it, vi } from "vitest";
import { defaultOpenGraphImageUrl, openGraphForPage } from "@/lib/seo/social-metadata";

vi.mock("@/lib/site-url", () => ({
  getSiteUrl: () => "https://whereto30a.com",
}));

describe("openGraphForPage", () => {
  it("includes url and fallback image when page has no hero", () => {
    const meta = openGraphForPage({
      path: "/towns",
      title: "30A Beach Towns | WhereTo30A",
      description: "Every beach community along Scenic 30A.",
    });

    expect(meta.openGraph?.url).toBe("https://whereto30a.com/towns");
    expect(meta.openGraph?.images).toEqual([{ url: defaultOpenGraphImageUrl() }]);
    expect(meta.twitter?.images).toEqual([defaultOpenGraphImageUrl()]);
  });

  it("uses page image when provided", () => {
    const meta = openGraphForPage({
      path: "/business/starbucks",
      title: "Starbucks | WhereTo30A",
      description: "Coffee in Watersound.",
      imageUrl: "https://cdn.example.com/hero.jpg",
    });

    expect(meta.openGraph?.images).toEqual([{ url: "https://cdn.example.com/hero.jpg" }]);
    expect(meta.openGraph?.url).toBe("https://whereto30a.com/business/starbucks");
  });
});
