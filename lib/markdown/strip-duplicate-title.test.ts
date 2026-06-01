import { describe, expect, it } from "vitest";
import { stripLeadingH1MatchingTitle } from "./strip-duplicate-title";

describe("stripLeadingH1MatchingTitle", () => {
  it("removes a leading H1 when it matches the page title", () => {
    const title = "Grayton Beach Driving Permits: What Visitors Need to Know";
    const md = `# ${title}\n\nFirst paragraph.`;
    expect(stripLeadingH1MatchingTitle(md, title)).toBe("First paragraph.");
  });

  it("leaves markdown unchanged when the H1 differs", () => {
    const md = "# Other Title\n\nBody.";
    expect(stripLeadingH1MatchingTitle(md, "Page Title")).toBe(md);
  });
});
