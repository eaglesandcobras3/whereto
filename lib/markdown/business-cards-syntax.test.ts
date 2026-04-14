import { describe, expect, it } from "vitest";
import {
  escapeMarkdownLinkTitle,
  extractBusinessCardSlugs,
  preprocessMarkdownForBusinessCards,
} from "./business-cards-syntax";

describe("extractBusinessCardSlugs", () => {
  it("finds slugs in list items", () => {
    const md = `
- [[the-red-bar]] — Jazz
- [[chiringo]]
`;
    expect(extractBusinessCardSlugs(md)).toEqual(["the-red-bar", "chiringo"]);
  });

  it("dedupes and preserves order", () => {
    const md = "- [[a]]\n- [[b]]\n- [[a]]";
    expect(extractBusinessCardSlugs(md)).toEqual(["a", "b"]);
  });

  it("supports standalone lines", () => {
    expect(extractBusinessCardSlugs("[[x]] — y")).toEqual(["x"]);
  });
});

describe("preprocessMarkdownForBusinessCards", () => {
  it("rewrites list lines to whereto-card links", () => {
    const out = preprocessMarkdownForBusinessCards(
      "- [[the-red-bar]] — Famous for jazz",
    );
    expect(out).toContain("whereto-card:the-red-bar");
    expect(out).toContain("Famous for jazz");
  });

  it("escapes quotes in link titles", () => {
    const out = preprocessMarkdownForBusinessCards('- [[x]] — Say "hi"');
    expect(out).toContain('\\"hi\\"');
  });
});

describe("escapeMarkdownLinkTitle", () => {
  it("escapes backslashes and quotes", () => {
    expect(escapeMarkdownLinkTitle(`a\\b"c`)).toBe(`a\\\\b\\"c`);
  });
});
