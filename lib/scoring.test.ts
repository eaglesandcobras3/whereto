import { describe, expect, it } from "vitest";
import {
  locationProximityMultiplier,
  passesEligibility,
  scoreAndRankCandidates,
  type BusinessRowWithTags,
  type LocationRankingScope,
} from "@/lib/scoring";
import {
  distanceMeters,
  findDuplicatePairs,
  nameSimilarity,
  type BusinessStub,
} from "@/lib/admin/duplicate-detection";

describe("distanceMeters", () => {
  it("is ~0 for identical points", () => {
    expect(distanceMeters(30.32, -86.13, 30.32, -86.13)).toBeLessThan(1);
  });
  it("is small for nearby Seaside-ish coords", () => {
    const d = distanceMeters(30.321, -86.135, 30.322, -86.136);
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThan(500);
  });
});

describe("nameSimilarity", () => {
  it("returns 1 for identical normalized", () => {
    expect(nameSimilarity("Bud & Alley's", "Bud & Alley's")).toBe(1);
  });
  it("is high for typos", () => {
    expect(nameSimilarity("Seaside Cafe", "Seaside Caffe")).toBeGreaterThan(0.5);
  });
});

describe("locationProximityMultiplier", () => {
  const scope: LocationRankingScope = {
    anchorTownId: 1,
    adjacentTownIds: new Set([2]),
    regionTownIds: new Set([3, 4]),
  };
  it("returns 1 without scope", () => {
    expect(locationProximityMultiplier(1, null)).toBe(1);
  });
  it("same town is 1", () => {
    expect(locationProximityMultiplier(1, scope)).toBe(1);
  });
  it("adjacent is 0.85", () => {
    expect(locationProximityMultiplier(2, scope)).toBe(0.85);
  });
  it("region non-adjacent is 0.7", () => {
    expect(locationProximityMultiplier(3, scope)).toBe(0.7);
  });
  it("outside region is 0.45", () => {
    expect(locationProximityMultiplier(99, scope)).toBe(0.45);
  });
});

describe("passesEligibility", () => {
  const base = {
    id: "x",
    town_id: 1,
    category_id: 1,
    status: "active",
    suspected_closed: false,
    admin_suppressed: false,
    confidence_score: 0.6,
    freshness_score: 0.5,
    engagement_score: 0.2,
    exploration_score: 0,
    completeness_score: 0.5,
    bad_experience_unique_users: 0,
    listing_rating: 4.2,
    listing_review_count: 10,
    tag_slugs: [] as string[],
  };
  it("rejects low confidence", () => {
    expect(
      passesEligibility({ ...base, confidence_score: 0.2 }, new Set()),
    ).toBe(false);
  });
  it("rejects suppressed id", () => {
    expect(passesEligibility(base, new Set(["x"]))).toBe(false);
  });
});

describe("scoreAndRankCandidates", () => {
  it("orders by composite when multiple rows", () => {
    const intent = {
      category: "restaurants",
      subcategory: null,
      location: { town: "seaside", radius: "near" as const },
      attributes: [] as string[],
      exclude_attributes: [] as string[],
      sort_preference: "quality" as const,
      price_level: null,
      result_count: 5,
    };
    const townSlugToId = new Map([["seaside", 1]]);
    const categorySlugToId = new Map([["restaurants", 1]]);
    const rows: BusinessRowWithTags[] = [
      {
        ...{
          id: "a",
          name: "A",
          town_id: 1,
          category_id: 1,
          status: "active",
          suspected_closed: false,
          admin_suppressed: false,
          confidence_score: 0.9,
          freshness_score: 1,
          engagement_score: 0.5,
          exploration_score: 0,
          completeness_score: 0.8,
          bad_experience_unique_users: 0,
          listing_rating: 4.5,
          listing_review_count: 100,
        },
        tag_slugs: [],
      },
      {
        ...{
          id: "b",
          name: "B",
          town_id: 1,
          category_id: 1,
          status: "active",
          suspected_closed: false,
          admin_suppressed: false,
          confidence_score: 0.5,
          freshness_score: 1,
          engagement_score: 0.1,
          exploration_score: 0,
          completeness_score: 0.5,
          bad_experience_unique_users: 0,
          listing_rating: 3,
          listing_review_count: 5,
        },
        tag_slugs: [],
      },
    ];
    const out = scoreAndRankCandidates(
      rows,
      intent,
      townSlugToId,
      categorySlugToId,
      new Set(),
      15,
    );
    expect(out[0]?.id).toBe("a");
  });

  it("ranks 300 candidates within a small time budget (sanity)", () => {
    const intent = {
      category: "restaurants",
      subcategory: null,
      location: { town: "seaside", radius: "near" as const },
      attributes: [] as string[],
      exclude_attributes: [] as string[],
      sort_preference: "quality" as const,
      price_level: null,
      result_count: 10,
    };
    const townSlugToId = new Map([["seaside", 1]]);
    const categorySlugToId = new Map([["restaurants", 1]]);
    const base = {
      name: "Spot",
      town_id: 1,
      category_id: 1,
      status: "active",
      suspected_closed: false,
      admin_suppressed: false,
      confidence_score: 0.6,
      freshness_score: 0.7,
      engagement_score: 0.2,
      exploration_score: 0.1,
      completeness_score: 0.5,
      bad_experience_unique_users: 0,
      listing_rating: 4.0,
      listing_review_count: 20,
      tag_slugs: [] as string[],
    };
    const rows: BusinessRowWithTags[] = Array.from({ length: 300 }, (_, i) => ({
      ...base,
      id: `b${i}`,
    }));
    const t0 = performance.now();
    scoreAndRankCandidates(
      rows,
      intent,
      townSlugToId,
      categorySlugToId,
      new Set(),
      15,
    );
    expect(performance.now() - t0).toBeLessThan(250);
  });
});

describe("findDuplicatePairs (admin)", () => {
  it("finds same-name neighbors", () => {
    const stubs: BusinessStub[] = [
      {
        id: "1",
        name: "Test Cafe",
        town_id: 1,
        lat: 30.32,
        lng: -86.13,
        status: "active",
      },
      {
        id: "2",
        name: "Test Cafe",
        town_id: 1,
        lat: 30.32001,
        lng: -86.13001,
        status: "active",
      },
    ];
    const pairs = findDuplicatePairs(stubs, { maxDistanceM: 50, minNameSim: 0.9 });
    expect(pairs.length).toBe(1);
  });
});
