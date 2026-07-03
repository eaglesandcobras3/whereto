import { describe, expect, it } from "vitest";
import { aggregateSearchTagCounts } from "./search-tag-aggregate";

describe("aggregateSearchTagCounts", () => {
  it("counts distinct tags across listings", () => {
    const counts = aggregateSearchTagCounts([
      { search_tags: ["gluten_free", "donuts"] },
      { search_tags: ["gluten_free", "coffee"] },
      { search_tags: ["donuts"] },
    ]);
    expect(counts.get("gluten_free")).toBe(2);
    expect(counts.get("donuts")).toBe(2);
    expect(counts.get("coffee")).toBe(1);
  });
});
