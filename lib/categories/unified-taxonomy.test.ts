import { describe, expect, it } from "vitest";
import {
  BUSINESS_SLUG_TO_LEAF,
  getUnifiedLeaves,
  getUnifiedRollups,
  OLD_SERVICE_SLUG_TO_LEAF,
  OLD_STOREFRONT_SLUG_TO_LEAF,
  slugifyCategoryLabel,
} from "@/lib/categories/unified-taxonomy";

describe("unified taxonomy", () => {
  it("has 15 rollups and 110 leaves with unique leaf slugs", () => {
    const rollups = getUnifiedRollups();
    const leaves = getUnifiedLeaves();
    expect(rollups).toHaveLength(15);
    expect(leaves).toHaveLength(110);
    const slugs = leaves.map((l) => l.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("slugifies rollup labels", () => {
    expect(slugifyCategoryLabel("Food & Drink")).toBe("food_and_drink");
    expect(slugifyCategoryLabel("Things To Do")).toBe("things_to_do");
  });

  it("maps common legacy storefront and service slugs", () => {
    expect(OLD_STOREFRONT_SLUG_TO_LEAF.restaurants).toBe("restaurants");
    expect(OLD_STOREFRONT_SLUG_TO_LEAF.hotels).toBe("hotels_and_resorts");
    expect(OLD_SERVICE_SLUG_TO_LEAF.plumbing).toBe("plumbing");
    expect(OLD_SERVICE_SLUG_TO_LEAF.legal).toBe("legal");
  });

  it("maps the five former catch-all services listings by business slug", () => {
    expect(BUSINESS_SLUG_TO_LEAF["ohana-day-school-grand-boulevard"]).toBe("childcare");
    expect(BUSINESS_SLUG_TO_LEAF["ohana-day-school-30avenue"]).toBe("childcare");
    expect(BUSINESS_SLUG_TO_LEAF["hill-coleman-cpa-firm-business-advisors"]).toBe(
      "financial_services",
    );
    expect(BUSINESS_SLUG_TO_LEAF["watersound-title-agency"]).toBe("real_estate");
    expect(
      BUSINESS_SLUG_TO_LEAF["dermatology-specialists-of-florida-and-aqua-medical-spa"],
    ).toBe("dermatology");
  });

  it("keeps duplicate jewelry / golf cart titles as distinct slugs", () => {
    const leaves = getUnifiedLeaves();
    const jewelry = leaves.filter((l) => l.title === "Jewelry");
    expect(jewelry.map((l) => l.slug).sort()).toEqual(["retail_jewelry", "shopping_jewelry"]);
    const carts = leaves.filter((l) => l.title === "Golf Cart Rentals");
    expect(carts.map((l) => l.slug).sort()).toEqual([
      "automotive_golf_cart_rentals",
      "rentals_golf_cart_rentals",
    ]);
  });
});
