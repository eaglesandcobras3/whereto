import { describe, expect, it } from "vitest";
import {
  categoryDbSlugFromLegacyOn30aSegment,
  categoryDbSlugFromPublicPath,
  categoryHubPath,
  legacyCategoryPath,
} from "@/lib/routes/category-hub-path";

describe("categoryHubPath", () => {
  it("uses short canonical paths", () => {
    expect(categoryHubPath("restaurants")).toBe("/restaurants");
    expect(categoryHubPath("coffee_shops")).toBe("/coffee-shops");
    expect(categoryHubPath("services")).toBe("/service-businesses");
  });

  it("normalizes aliases", () => {
    expect(categoryHubPath("coffee")).toBe("/coffee-shops");
  });

  it("falls back for unknown slugs", () => {
    expect(categoryHubPath("pet_grooming")).toBe("/pet-grooming");
  });
});

describe("categoryDbSlugFromPublicPath", () => {
  it("reverses public segments", () => {
    expect(categoryDbSlugFromPublicPath("restaurants")).toBe("restaurants");
    expect(categoryDbSlugFromPublicPath("coffee-shops")).toBe("coffee_shops");
    expect(categoryDbSlugFromPublicPath("service-businesses")).toBe("services");
  });

  it("does not treat legacy -on-30a paths as canonical", () => {
    expect(categoryDbSlugFromPublicPath("restaurants-on-30a")).toBeNull();
  });
});

describe("categoryDbSlugFromLegacyOn30aSegment", () => {
  it("maps old paths to db slugs", () => {
    expect(categoryDbSlugFromLegacyOn30aSegment("restaurants-on-30a")).toBe("restaurants");
    expect(categoryDbSlugFromLegacyOn30aSegment("services-on-30a")).toBe("services");
  });
});

describe("legacyCategoryPath", () => {
  it("keeps categories prefix for redirects", () => {
    expect(legacyCategoryPath("coffee_shops")).toBe("/categories/coffee_shops");
  });
});
