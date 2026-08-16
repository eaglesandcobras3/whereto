import { describe, expect, it } from "vitest";
import {
  BROWSE_VISIBLE_NOT_HIDDEN,
  DIRECTUS_PUBLISHED_STATUS,
  PUBLISHED_MEANS_INDEXABLE_TABLES,
} from "@/lib/shop/public-listing-filters";
import { isGuideEligibleForSitemap } from "@/lib/seo/sitemap-guide-eligibility";

describe("published means indexable (towns/areas/guides)", () => {
  it("documents editorial tables that ignore soft-hide", () => {
    expect(PUBLISHED_MEANS_INDEXABLE_TABLES).toEqual(["towns", "areas", "guides"]);
  });

  it("keeps business soft-hide filter available for listings", () => {
    expect(BROWSE_VISIBLE_NOT_HIDDEN).toContain("is_hidden_from_search");
  });

  it("treats published guide status as sitemap-eligible regardless of hide flag shape", () => {
    expect(DIRECTUS_PUBLISHED_STATUS).toBe("published");
    expect(isGuideEligibleForSitemap({ slug: "first-timers", status: "published" })).toBe(true);
    // Eligibility is status-only; is_hidden_from_search is not part of the check.
    expect(
      isGuideEligibleForSitemap({
        slug: "first-timers",
        status: "published",
        is_hidden_from_search: true,
      } as { slug: string; status: string }),
    ).toBe(true);
  });
});
