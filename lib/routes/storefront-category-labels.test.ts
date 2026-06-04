import { describe, expect, it } from "vitest";
import {
  displayStorefrontCategoryTitle,
  STOREFRONT_SERVICES_CATEGORY_SLUG,
} from "@/lib/routes/storefront-category-labels";

describe("displayStorefrontCategoryTitle", () => {
  it("renames storefront services category", () => {
    expect(
      displayStorefrontCategoryTitle(STOREFRONT_SERVICES_CATEGORY_SLUG, "Services"),
    ).toBe("Service businesses");
  });

  it("passes through other slugs", () => {
    expect(displayStorefrontCategoryTitle("restaurants", "Restaurants")).toBe("Restaurants");
  });
});
