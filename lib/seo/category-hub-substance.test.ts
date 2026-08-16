import { describe, expect, it } from "vitest";
import {
  buildCategoryHubEditorialBody,
  buildCategoryHubFaqs,
  buildCategoryHubHeroDescription,
  buildCategoryHubMetaDescription,
  buildCategoryHubTitleSegment,
  categoryHubHasEditorialBlock,
  isCategoryHubIndexEligible,
} from "@/lib/seo/category-hub-substance";

const coffee = {
  title: "Coffee shops",
  slug: "coffee_shops",
  listingCount: 12,
  townNames: ["Rosemary Beach", "Seaside", "Grayton Beach"],
  regionalCount: 1,
  featuredNames: ["Amavida", "Cafe Thirty-A"],
};

describe("category hub substance", () => {
  it("requires min listings for index eligibility", () => {
    expect(isCategoryHubIndexEligible(0)).toBe(false);
    expect(isCategoryHubIndexEligible(2)).toBe(false);
    expect(isCategoryHubIndexEligible(3)).toBe(true);
  });

  it("builds inventory-aware hero and meta that name real towns", () => {
    const hero = buildCategoryHubHeroDescription(coffee);
    const meta = buildCategoryHubMetaDescription(coffee);
    expect(hero).toContain("12");
    expect(hero).toContain("Rosemary Beach");
    expect(meta).toContain("Grayton Beach");
    expect(meta).not.toContain("Find the best");
  });

  it("prefers excerpt, then seeded body, with distinct FAQs per inventory", () => {
    const fromExcerpt = buildCategoryHubEditorialBody({
      ...coffee,
      excerpt: "A".repeat(50),
    });
    expect(fromExcerpt).toBe("A".repeat(50));

    const seeded = buildCategoryHubEditorialBody(coffee);
    expect(seeded.toLowerCase()).toContain("coffee");
    expect(seeded).not.toContain("This hub groups");

    const faqs = buildCategoryHubFaqs(coffee);
    expect(faqs.length).toBeGreaterThanOrEqual(2);
    expect(faqs[0]!.answer).toContain("Rosemary Beach");
    expect(categoryHubHasEditorialBlock(coffee)).toBe(true);
  });

  it("varies title segment by town coverage", () => {
    expect(buildCategoryHubTitleSegment(coffee)).toContain("By Town");
    expect(
      buildCategoryHubTitleSegment({
        ...coffee,
        townNames: ["Seaside"],
      }),
    ).toContain("Seaside");
  });
});
