import { describe, expect, it } from "vitest";
import { splitMarkdownByH2 } from "@/lib/markdown/split-by-h2";

describe("splitMarkdownByH2", () => {
  it("returns a single intro section when there are no h2 headings", () => {
    expect(splitMarkdownByH2("Intro paragraph.\n\nMore detail.")).toEqual([
      { title: null, body: "Intro paragraph.\n\nMore detail." },
    ]);
  });

  it("splits markdown at h2 headings", () => {
    expect(
      splitMarkdownByH2("## Beaches\nSand and surf.\n\n## Dining\nRestaurants."),
    ).toEqual([
      { title: "Beaches", body: "Sand and surf." },
      { title: "Dining", body: "Restaurants." },
    ]);
  });

  it("keeps content before the first h2 as an intro section", () => {
    expect(
      splitMarkdownByH2("Overview copy.\n\n## Beaches\nSand and surf."),
    ).toEqual([
      { title: null, body: "Overview copy." },
      { title: "Beaches", body: "Sand and surf." },
    ]);
  });
});
