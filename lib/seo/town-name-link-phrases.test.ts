import { describe, expect, it } from "vitest";
import { findTownNameMatches } from "@/lib/seo/town-name-link-phrases";

describe("findTownNameMatches", () => {
  it("matches full town names in prose", () => {
    const matches = findTownNameMatches(
      "Plan dinners in Seagrove, Seaside, or Rosemary.",
    );
    expect(matches.map((m) => m.slug)).toEqual([
      "seagrove-beach",
      "seaside",
      "rosemary-beach",
    ]);
  });

  it("prefers longer phrases over short aliases", () => {
    const matches = findTownNameMatches("Rosemary Beach is walkable.");
    expect(matches).toHaveLength(1);
    expect(matches[0]?.slug).toBe("rosemary-beach");
    expect(matches[0]?.text).toBe("Rosemary Beach");
  });

  it("skips excluded slug", () => {
    const matches = findTownNameMatches("Rosemary and Seacrest are close.", {
      excludeSlug: "rosemary-beach",
    });
    expect(matches.map((m) => m.slug)).toEqual(["seacrest-beach"]);
  });

  it("does not match inside other words", () => {
    expect(findTownNameMatches("Destiny awaits")).toEqual([]);
  });
});
