import { describe, expect, it } from "vitest";
import { refineSearch } from "@/lib/ask/refinement";
import type { BusinessResultsArtifact } from "@/lib/ask/types";

const businessArtifact: BusinessResultsArtifact = {
  type: "business_results",
  title: "Dinner",
  activeFilters: { query: "seafood", town_or_area: "Seaside" },
  results: [],
};

describe("refineSearch", () => {
  it("forks session on pivot", () => {
    const out = refineSearch({
      message: "show coffee instead",
      intent: "pivot",
      activeFilters: { query: "seafood" },
      searchContext: { lastQuery: "seafood", lastTool: "searchBusinesses", resultCount: 3 },
      refinementHistory: [],
      existingArtifact: businessArtifact,
    });
    expect(out.forkSession).toBe(true);
    expect(out.refinementHint).toContain("new search");
  });

  it("merges filters and appends history on refine", () => {
    const out = refineSearch({
      message: "gluten free",
      intent: "refine",
      activeFilters: { query: "seafood" },
      searchContext: { lastQuery: "seafood", lastTool: "searchBusinesses", resultCount: 2 },
      refinementHistory: [],
      existingArtifact: businessArtifact,
    });
    expect(out.forkSession).toBe(false);
    expect(out.refinementHistory).toHaveLength(1);
    expect(out.composedQuery).toContain("gluten free");
    expect(out.refinementHint).toContain("searchBusinesses");
  });
});
