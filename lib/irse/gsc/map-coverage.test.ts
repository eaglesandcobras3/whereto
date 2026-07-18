import { describe, expect, it } from "vitest";
import { mapCoverageToIndexed } from "./map-coverage";

describe("mapCoverageToIndexed", () => {
  it("maps indexed states", () => {
    expect(mapCoverageToIndexed("Submitted and indexed").indexed).toBe(true);
    expect(mapCoverageToIndexed("URL is on Google").indexed).toBe(true);
    expect(mapCoverageToIndexed("Indexed").indexed).toBe(true);
  });

  it("maps not-indexed states", () => {
    expect(mapCoverageToIndexed("Crawled - currently not indexed").indexed).toBe(false);
    expect(mapCoverageToIndexed("Discovered - currently not indexed").indexed).toBe(false);
    expect(mapCoverageToIndexed("URL is unknown to Google").indexed).toBe(false);
    expect(mapCoverageToIndexed("Excluded by 'noindex' tag").indexed).toBe(false);
  });

  it("returns null when unknown / empty", () => {
    expect(mapCoverageToIndexed(null).indexed).toBe(null);
    expect(mapCoverageToIndexed("").indexed).toBe(null);
    expect(mapCoverageToIndexed("Some future state").indexed).toBe(null);
  });
});
