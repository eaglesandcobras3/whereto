import { describe, expect, it, vi, afterEach } from "vitest";
import { captureAskSearchDebug } from "@/lib/ask/search-debug";
import type { SearchResultPayload } from "@/lib/search/types";

const basePayload: SearchResultPayload = {
  query: "coffee",
  query_hash: "h",
  normalized_query: "coffee",
  summary: "Found 0",
  recommendations: [],
  cached: false,
  _debug: {
    intent: { category: "coffee_shops" },
    filterCategoryId: "cat-1",
    resolvedTownId: undefined,
    nearTownIds: undefined,
    searchTermOverride: undefined,
    skipIlike: false,
    pageBrowseWithoutQuery: false,
  },
};

describe("captureAskSearchDebug", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns undefined in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(
      captureAskSearchDebug({
        toolInput: { query: "coffee" },
        categorySlug: "coffee_shops",
        payload: basePayload,
        resultCount: 0,
      }),
    ).toBeUndefined();
  });

  it("captures tool input and search debug in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    const debug = captureAskSearchDebug({
      toolInput: { query: "coffee", category: "coffee" },
      categorySlug: "coffee_shops",
      constrainTownId: "town-1",
      payload: basePayload,
      resultCount: 0,
    });
    expect(debug?.tool).toBe("searchBusinesses");
    expect(debug?.toolInput.category_normalized).toBe("coffee_shops");
    expect(debug?._debug?.filterCategoryId).toBe("cat-1");
    expect(debug?.resultCount).toBe(0);
  });
});
