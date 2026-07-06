import { describe, expect, it } from "vitest";
import {
  buildDiscoverFilterKey,
  DISCOVER_LOW_RESULTS_MAX,
  hasActiveDiscoverFilters,
  shouldTrackDiscoverLowResults,
} from "@/lib/discovery-filters/discover-low-results";
import type { DiscoveryFilterState } from "@/lib/discovery-filters/filter-state";
import type { DiscoverFilterSearchResult } from "@/lib/discovery-filters/types";

const baseState: DiscoveryFilterState = {
  entity_type: "storefront",
  town_ids: [],
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
      town_ids: ["b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2"],
      category_slug: "food",
      tags: ["outdoor", "froyo"],
      q: "Pizza",
    });
    expect(key).toBe(
      "storefront|towns:b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2|category:food|tags:froyo+outdoor|q:pizza",
    );
  });
});

describe("shouldTrackDiscoverLowResults", () => {
  it(`tracks when total is <= ${DISCOVER_LOW_RESULTS_MAX} with active filters`, () => {
    expect(
      shouldTrackDiscoverLowResults(
        { ...baseState, tags: ["froyo"] },
        result(2),
      ),
    ).toBe(true);
  });

  it("does not track when total is above threshold", () => {
    expect(
      shouldTrackDiscoverLowResults(
        { ...baseState, tags: ["froyo"] },
        result(4),
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
