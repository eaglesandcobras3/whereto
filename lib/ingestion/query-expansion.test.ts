import { describe, it, expect } from "vitest";
import { expandDiscoveryQueries } from "./query-expansion";

describe("expandDiscoveryQueries", () => {
  it("returns variants using lowercased category", () => {
    const q = expandDiscoveryQueries({
      categoryName: "Coffee",
      townName: "Seaside",
    });
    expect(q).toContain("coffee in Seaside FL");
    expect(q).toContain("coffee near Seaside Florida");
    expect(q).toContain("coffee Seaside 30A");
    expect(q.length).toBeGreaterThanOrEqual(5);
  });

  it("returns empty when names missing", () => {
    expect(expandDiscoveryQueries({ categoryName: "", townName: "X" })).toEqual(
      [],
    );
    expect(expandDiscoveryQueries({ categoryName: "Y", townName: "  " })).toEqual(
      [],
    );
  });
});
