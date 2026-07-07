import { describe, expect, it } from "vitest";
import { isGuideEligibleForSitemap } from "@/lib/seo/sitemap-guide-eligibility";

describe("isGuideEligibleForSitemap", () => {
  it("excludes archived status on guides row", () => {
    expect(isGuideEligibleForSitemap({ slug: "x", status: "archived" })).toBe(false);
  });

  it("excludes draft status on guides row", () => {
    expect(isGuideEligibleForSitemap({ slug: "x", status: "draft" })).toBe(false);
  });

  it("includes published guides", () => {
    expect(isGuideEligibleForSitemap({ slug: "x", status: "published" })).toBe(true);
  });
});
