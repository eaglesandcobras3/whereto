import { describe, expect, it } from "vitest";
import { markdownSectionPreview, sectionIconForTitle } from "@/lib/markdown/section-meta";

describe("sectionIconForTitle", () => {
  it("maps beach-related titles", () => {
    expect(sectionIconForTitle("Best beaches")).toBe("beach_access");
  });

  it("falls back to explore", () => {
    expect(sectionIconForTitle("Miscellaneous")).toBe("explore");
  });
});

describe("markdownSectionPreview", () => {
  it("strips markdown and truncates", () => {
    expect(
      markdownSectionPreview("## Heading\n\nThis is a **long** intro about the town.", 20),
    ).toBe("This is a long intro…");
  });
});
