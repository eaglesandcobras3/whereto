import { describe, expect, it } from "vitest";
import {
  SERVICE_CATEGORY_CLASSIFICATION_GUIDE,
  SERVICE_CATEGORY_LABELS,
  SERVICE_CATEGORY_SLUGS,
} from "@/lib/service-categories/constants";
import {
  SERVICE_CATEGORY_GROUP_MEMBERS,
  serviceCategoryGroupForSlug,
} from "@/lib/service-categories/groups";
import { normalizeServiceCategorySlug } from "@/lib/service-categories/normalize";
import {
  suggestServiceCategoryFromBusinessType,
  suggestServiceCategoryFromListing,
} from "@/lib/service-categories/suggest-from-business-type";

describe("service category taxonomy", () => {
  it("every slug has label, guide, and group", () => {
    const grouped = new Set<string>();
    for (const members of Object.values(SERVICE_CATEGORY_GROUP_MEMBERS)) {
      for (const slug of members) grouped.add(slug);
    }
    for (const slug of SERVICE_CATEGORY_SLUGS) {
      expect(SERVICE_CATEGORY_LABELS[slug]).toBeTruthy();
      expect(SERVICE_CATEGORY_CLASSIFICATION_GUIDE[slug]).toBeTruthy();
      expect(grouped.has(slug)).toBe(true);
      expect(serviceCategoryGroupForSlug(slug)).toBeTruthy();
    }
    expect(grouped.size).toBe(SERVICE_CATEGORY_SLUGS.length);
  });

  it("suggests known business types from services.csv", () => {
    expect(suggestServiceCategoryFromBusinessType("insurance agency")).toBe("insurance");
    expect(suggestServiceCategoryFromBusinessType("pediatric dentist")).toBe("health_medical");
    expect(suggestServiceCategoryFromBusinessType("watersports rental")).toBe("marine_boat");
    expect(suggestServiceCategoryFromBusinessType("restaurant")).toBeNull();
  });

  it("normalizes model slug hospice to health_medical", () => {
    expect(normalizeServiceCategorySlug("hospice")).toBe("health_medical");
  });

  it("suggests health_medical for hospice listings", () => {
    expect(
      suggestServiceCategoryFromListing({
        title: "Gentiva Hospice",
        business_type: "hospice provider",
      }),
    ).toBe("health_medical");
  });

  it("suggests insurance for State Farm agent titles", () => {
    expect(
      suggestServiceCategoryFromListing({
        title: "James Sater, State Farm",
        business_type: null,
      }),
    ).toBe("insurance");
    expect(normalizeServiceCategorySlug("state_farm")).toBe("insurance");
  });

  it("suggests legal from law firm titles without business_type", () => {
    expect(
      suggestServiceCategoryFromListing({
        title: "Clark Partington Attorneys at Law (Destin) Santa Rosa Beach",
        business_type: null,
      }),
    ).toBe("legal");
  });
});
