import { describe, expect, it } from "vitest";
import { extractOverviewFromContent } from "./extract-overview";

describe("extractOverviewFromContent", () => {
  it("returns null for empty content", () => {
    expect(extractOverviewFromContent(null)).toBeNull();
    expect(extractOverviewFromContent("")).toBeNull();
    expect(extractOverviewFromContent("   ")).toBeNull();
  });

  it("extracts the pre-H2 preamble when sections follow", () => {
    const content = `Visiting Seaside? This spot is a highlight.

## What It Is

A unique eatery in Seaside.`;
    expect(extractOverviewFromContent(content)).toBe(
      "Visiting Seaside? This spot is a highlight.",
    );
  });

  it("keeps a multi-paragraph preamble before the first H2", () => {
    const content = `First paragraph.

Second paragraph of overview.

## What It Is

Body.`;
    expect(extractOverviewFromContent(content)).toBe(
      "First paragraph.\n\nSecond paragraph of overview.",
    );
  });

  it("returns null when content starts with an H2", () => {
    expect(extractOverviewFromContent("## What It Is\n\nBody only.")).toBeNull();
  });

  it("takes the first paragraph when there are no H2s", () => {
    expect(
      extractOverviewFromContent("Opening line here.\n\nMore detail follows."),
    ).toBe("Opening line here.");
  });

  it("returns the whole body when there is a single paragraph and no H2", () => {
    expect(extractOverviewFromContent("Just one paragraph.")).toBe(
      "Just one paragraph.",
    );
  });

  it("strips a leading H1 that matches the business title", () => {
    const content = `# Raw and Juicy

Opening overview.

## What It Is

Body.`;
    expect(extractOverviewFromContent(content, "Raw and Juicy")).toBe(
      "Opening overview.",
    );
  });
});
