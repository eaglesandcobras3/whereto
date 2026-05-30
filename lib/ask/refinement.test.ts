import { describe, expect, it } from "vitest";
import {
  classifyRefinementIntent,
  composeSearchQuery,
  isSearchResultsArtifact,
  mergeFilters,
  shouldForkSession,
} from "@/lib/ask/refinement";

describe("classifyRefinementIntent", () => {
  it("detects form intent", () => {
    expect(classifyRefinementIntent("I want to list my business", false)).toBe("form");
  });

  it("refines when artifact is active", () => {
    expect(classifyRefinementIntent("more casual please", true)).toBe("refine");
  });

  it("pivots on explicit instead language", () => {
    expect(classifyRefinementIntent("show coffee instead", true)).toBe("pivot");
  });
});

describe("mergeFilters", () => {
  it("merges tag arrays without dropping base tags", () => {
    const merged = mergeFilters(
      { query: "tacos", tags: ["outdoor"] },
      { tags: ["family-friendly"] },
    );
    expect(merged.tags).toEqual(["family-friendly"]);
    expect(merged.query).toBe("tacos");
  });
});

describe("composeSearchQuery", () => {
  it("keeps refinement context on refine intent", () => {
    const q = composeSearchQuery(
      { query: "seafood", town_or_area: "Seaside" },
      "gluten free",
      "refine",
    );
    expect(q).toContain("seafood");
    expect(q).toContain("gluten free");
    expect(q).toContain("Seaside");
  });
});

describe("shouldForkSession", () => {
  it("forks on new search and pivot", () => {
    expect(shouldForkSession("new_search")).toBe(true);
    expect(shouldForkSession("pivot")).toBe(true);
    expect(shouldForkSession("refine")).toBe(false);
  });
});

describe("isSearchResultsArtifact", () => {
  it("recognizes editorial and business result artifacts", () => {
    expect(
      isSearchResultsArtifact({
        type: "town_results",
        title: "Towns",
        results: [],
        activeFilters: {},
      }),
    ).toBe(true);
    expect(isSearchResultsArtifact({ type: "empty_state", title: "x", message: "y" })).toBe(
      false,
    );
  });
});
