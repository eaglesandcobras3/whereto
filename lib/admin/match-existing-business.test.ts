import { describe, expect, it } from "vitest";
import {
  coreSlug,
  findExistingBusinessMatch,
  isPhysicalRestaurantOrStorefront,
  resolveServiceCsvCandidate,
} from "./match-existing-business";

const STOREFRONT = [
  {
    id: "1",
    title: "Colombia and Company Seaside",
    slug: "colombia-and-company-seaside",
    is_storefront: true,
    category_slug: "shopping",
  },
  {
    id: "2",
    title: "Drybar Grand Boulevard",
    slug: "drybar-grand-boulevard",
    is_storefront: true,
    category_slug: "services",
  },
  {
    id: "3",
    title: "Beignets & Brew Grayton Beach, FL",
    slug: "beignets-brew-grayton-beach-fl",
    is_storefront: true,
    category_slug: "restaurants",
  },
];

describe("isPhysicalRestaurantOrStorefront", () => {
  it("flags food chamber rows", () => {
    expect(
      isPhysicalRestaurantOrStorefront({
        title: "Acme Oyster House",
        slug: "acme-oyster-house",
        category: "Food, Events & Hospitality",
        business_type: "seafood restaurant",
      }),
    ).toBe(true);
  });

  it("flags retail chamber rows", () => {
    expect(
      isPhysicalRestaurantOrStorefront({
        title: "Billabong",
        slug: "billabong",
        category: "Retail, Errands & Local Convenience",
        business_type: "surf shop",
      }),
    ).toBe(true);
  });

  it("does not flag plumbers", () => {
    expect(
      isPhysicalRestaurantOrStorefront({
        title: "Coastal Plumbing",
        slug: "coastal-plumbing",
        category: "Home Repair & Trades",
        business_type: "plumber",
      }),
    ).toBe(false);
  });
});

describe("findExistingBusinessMatch", () => {
  it("matches core slug", () => {
    const m = findExistingBusinessMatch(
      { title: "Colombia and Company", slug: "colombia-and-company" },
      STOREFRONT,
    );
    expect(m).not.toBeNull();
  });

  it("does not treat shopping center name as store duplicate", () => {
    const m = findExistingBusinessMatch(
      { title: "Grand Boulevard", slug: "grand-boulevard" },
      STOREFRONT,
    );
    expect(m).toBeNull();
  });

  it("matches beignets santa rosa to grayton location", () => {
    const m = findExistingBusinessMatch(
      {
        title: "Beignets and Brew- Santa Rosa Beach",
        slug: "beignets-and-brew-santa-rosa-beach",
        category: "Food, Events & Hospitality",
        business_type: "cafe",
      },
      STOREFRONT,
    );
    expect(m).not.toBeNull();
  });
});

describe("resolveServiceCsvCandidate", () => {
  it("rejects unmatched restaurant as physical listing", () => {
    const r = resolveServiceCsvCandidate(
      {
        title: "Acme Oyster House",
        slug: "acme-oyster-house",
        category: "Food, Events & Hospitality",
        business_type: "seafood restaurant",
      },
      STOREFRONT,
    );
    expect(r.action).toBe("reject");
  });

  it("imports unmatched plumber", () => {
    const r = resolveServiceCsvCandidate(
      {
        title: "Coastal Plumbing LLC",
        slug: "coastal-plumbing-llc",
        category: "Home Repair & Trades",
        business_type: "plumber",
      },
      STOREFRONT,
    );
    expect(r.action).toBe("import");
  });
});

describe("coreSlug", () => {
  it("strips location suffixes", () => {
    expect(coreSlug("cabana-by-the-seaside-style-seaside-fl")).toBe(
      "cabana-by-the-seaside-style",
    );
  });
});
