import { describe, expect, it } from "vitest";
import { buildDiscoverSearchTagOptions } from "@/lib/discovery-filters/build-discover-search-tag-options";

describe("buildDiscoverSearchTagOptions", () => {
  it("returns the full vocabulary even when a tag has zero listings in scope", () => {
    const options = buildDiscoverSearchTagOptions(
      [
        { slug: "coffee", description: null },
        { slug: "real_estate", description: "Real estate" },
      ],
      new Map([["coffee", 4]]),
    );

    expect(options.map((tag) => tag.slug)).toEqual(["coffee", "real_estate"]);
    expect(options.find((tag) => tag.slug === "real_estate")).toMatchObject({
      label: "Real estate",
      count: 0,
    });
  });

  it("appends non-vocabulary tags seen in scoped listings", () => {
    const options = buildDiscoverSearchTagOptions(
      [{ slug: "coffee", description: null }],
      new Map([
        ["coffee", 2],
        ["legacy_tag", 1],
      ]),
    );

    expect(options.map((tag) => tag.slug)).toEqual(["coffee", "legacy_tag"]);
  });
});
