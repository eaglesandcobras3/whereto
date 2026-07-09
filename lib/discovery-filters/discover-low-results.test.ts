import { describe, expect, it } from "vitest";
import {
  buildDiscoverFilterKey,
  DISCOVER_LOW_RESULTS_MAX_MULTI_OR_ALL_TOWNS,
  DISCOVER_LOW_RESULTS_MAX_SINGLE_TOWN,
  getDiscoverLowResultsMax,
  hasActiveDiscoverFilters,
  shouldTrackDiscoverLowResults,
} from "@/lib/discovery-filters/discover-low-results";
import type { DiscoveryFilterState } from "@/lib/discovery-filters/filter-state";
import type { DiscoverFilterSearchResult } from "@/lib/discovery-filters/types";

const townA = "a0000000-0000-4000-8000-000000000001";
const townB = "b0000000-0000-4000-8000-000000000002";
const townC = "c0000000-0000-4000-8000-000000000003";

const baseState: DiscoveryFilterState = {
  entity_type: "storefront",
  town_ids: [],
  anchor_town_ids: [],
  tags: [],
  page: 1,
  page_size: 24,
};

function result(total: number, applied: Record<string, unknown> = {}): DiscoverFilterSearchResult {
  return {
    listings: [],
    total,
    page: 1,
    page_size: 24,
    total_pages: total > 0 ? 1 : 0,
    applied_filters: {
      entity_type: "storefront",
      town_ids: [],
      tags: [],
      filter_mode: "scope_hard",
      ...applied,
    },
  };
}

describe("getDiscoverLowResultsMax", () => {
  it("uses 3 for a single town", () => {
    expect(getDiscoverLowResultsMax({ ...baseState, town_ids: [townA] })).toBe(
      DISCOVER_LOW_RESULTS_MAX_SINGLE_TOWN,
    );
  });

  it("uses 5 for all towns", () => {
    expect(getDiscoverLowResultsMax(baseState)).toBe(
      DISCOVER_LOW_RESULTS_MAX_MULTI_OR_ALL_TOWNS,
    );
  });

  it("uses 5 for two or more towns", () => {
    expect(getDiscoverLowResultsMax({ ...baseState, town_ids: [townA, townB] })).toBe(
      DISCOVER_LOW_RESULTS_MAX_MULTI_OR_ALL_TOWNS,
    );
    expect(
      getDiscoverLowResultsMax({ ...baseState, town_ids: [townA, townB, townC] }),
    ).toBe(DISCOVER_LOW_RESULTS_MAX_MULTI_OR_ALL_TOWNS);
  });
});

describe("hasActiveDiscoverFilters", () => {
  it("is false for entity type only", () => {
    expect(hasActiveDiscoverFilters(baseState)).toBe(false);
  });

  it("is true when tags are selected", () => {
    expect(hasActiveDiscoverFilters({ ...baseState, tags: ["froyo"] })).toBe(true);
  });
});

describe("buildDiscoverFilterKey", () => {
  it("includes entity, towns, category, tags, and q", () => {
    const key = buildDiscoverFilterKey({
      ...baseState,
      town_ids: [townA],
      category_slug: "food",
      tags: ["outdoor", "froyo"],
      q: "Pizza",
    });
    expect(key).toBe(
      `storefront|towns:${townA}|category:food|tags:froyo+outdoor|q:pizza`,
    );
  });
});

describe("shouldTrackDiscoverLowResults", () => {
  it("tracks at or below 3 for a single town", () => {
    expect(
      shouldTrackDiscoverLowResults(
        { ...baseState, town_ids: [townA], tags: ["froyo"] },
        result(3),
      ),
    ).toBe(true);
    expect(
      shouldTrackDiscoverLowResults(
        { ...baseState, town_ids: [townA], tags: ["froyo"] },
        result(4),
      ),
    ).toBe(false);
  });

  it("tracks at or below 5 for all towns", () => {
    expect(
      shouldTrackDiscoverLowResults({ ...baseState, tags: ["froyo"] }, result(5)),
    ).toBe(true);
    expect(
      shouldTrackDiscoverLowResults({ ...baseState, tags: ["froyo"] }, result(6)),
    ).toBe(false);
  });

  it("tracks at or below 5 for two towns", () => {
    expect(
      shouldTrackDiscoverLowResults(
        { ...baseState, town_ids: [townA, townB], tags: ["froyo"] },
        result(5),
      ),
    ).toBe(true);
    expect(
      shouldTrackDiscoverLowResults(
        { ...baseState, town_ids: [townA, townB], tags: ["froyo"] },
        result(6),
      ),
    ).toBe(false);
  });

  it("does not track page 2+", () => {
    expect(
      shouldTrackDiscoverLowResults(
        { ...baseState, tags: ["froyo"], page: 2 },
        result(1),
      ),
    ).toBe(false);
  });

  it("does not track without active filters", () => {
    expect(shouldTrackDiscoverLowResults(baseState, result(0))).toBe(false);
  });

  it("does not track search errors", () => {
    expect(
      shouldTrackDiscoverLowResults(
        { ...baseState, tags: ["froyo"] },
        result(0, { error: "db down" }),
      ),
    ).toBe(false);
  });
});
