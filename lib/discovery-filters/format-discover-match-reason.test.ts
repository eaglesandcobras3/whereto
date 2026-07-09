import { describe, expect, it } from "vitest";
import { formatDiscoverMatchReason } from "@/lib/discovery-filters/format-discover-match-reason";
import type { DiscoverListingRow } from "@/lib/discovery-filters/types";

const baseListing: DiscoverListingRow = {
  id: "1",
  slug: "test",
  title: "Test",
  excerpt: null,
  hero_image_url: null,
  town_name: "Rosemary Beach",
  town_slug: "rosemary-beach",
  category_slug: "restaurants",
  service_category_slug: null,
  business_type: "restaurant",
  search_tags: ["seafood"],
  tag_match: { matched: ["seafood"], missing: [] },
};

describe("formatDiscoverMatchReason", () => {
  it("explains a seafood restaurant in the anchor town", () => {
    const reason = formatDiscoverMatchReason({
      listing: baseListing,
      anchorTownSlugs: ["rosemary-beach"],
      labelForSlug: (slug) => slug.replace(/_/g, " "),
    });

    expect(reason).toBe("Restaurant with seafood in Rosemary Beach");
  });

  it("marks nearby towns outside the anchor", () => {
    const reason = formatDiscoverMatchReason({
      listing: {
        ...baseListing,
        town_name: "Inlet Beach",
        town_slug: "inlet-beach",
        category_slug: "specialty_retail",
        business_type: "market",
      },
      anchorTownSlugs: ["rosemary-beach"],
      labelForSlug: (slug) => slug.replace(/_/g, " "),
    });

    expect(reason).toBe("Market with seafood in Inlet Beach (nearby)");
  });
});
