import { describe, expect, it } from "vitest";
import { isGuideEligibleForSitemap } from "@/lib/seo/sitemap-guide-eligibility";

describe("isGuideEligibleForSitemap", () => {
  it("excludes archived content_entries slugs", () => {
    expect(
      isGuideEligibleForSitemap({ slug: "old-guide", status: "published" }, new Set(["old-guide"])),
    ).toBe(false);
  });

  it("excludes archived status on guides row", () => {
    expect(isGuideEligibleForSitemap({ slug: "x", status: "archived" }, new Set())).toBe(false);
  });

  it("includes published guides", () => {
    expect(isGuideEligibleForSitemap({ slug: "x", status: "published" }, new Set())).toBe(true);
  });
});
