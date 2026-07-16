import { describe, expect, it } from "vitest";
import type { ServiceCategoryRow } from "@/lib/data/service-vendors-hub";
import {
  findGroupForSpecialtySlug,
  groupListedServiceCategories,
} from "@/lib/service-categories/group-listed-categories";

function cat(slug: string, count: number): ServiceCategoryRow {
  return {
    id: slug,
    title: slug,
    slug,
    excerpt: null,
    vendor_count: count,
  };
}

describe("groupListedServiceCategories", () => {
  it("groups listed specialties and omits empty", () => {
    const grouped = groupListedServiceCategories([
      cat("legal", 2),
      cat("hvac", 5),
      cat("landscaping", 0),
    ]);
    expect(grouped.some((g) => g.categories.some((c) => c.slug === "legal"))).toBe(true);
    expect(grouped.some((g) => g.categories.some((c) => c.slug === "hvac"))).toBe(true);
    expect(
      grouped.flatMap((g) => g.categories).some((c) => c.slug === "landscaping"),
    ).toBe(false);
  });

  it("finds group for active specialty", () => {
    const grouped = groupListedServiceCategories([
      cat("insurance", 1),
      cat("plumbing", 3),
      cat("vacation_rentals", 2),
      cat("marketing_creative", 1),
    ]);
    expect(findGroupForSpecialtySlug(grouped, "insurance")).toBe("professional");
    expect(findGroupForSpecialtySlug(grouped, "plumbing")).toBe("home_trades");
    expect(findGroupForSpecialtySlug(grouped, "vacation_rentals")).toBe("vacation_guest");
    expect(findGroupForSpecialtySlug(grouped, "marketing_creative")).toBe("creative_events");
  });
});
