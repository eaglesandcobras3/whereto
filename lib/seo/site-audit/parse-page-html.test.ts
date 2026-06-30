import { describe, expect, it } from "vitest";
import { parsePageHtml } from "./parse-page-html";

describe("parsePageHtml", () => {
  it("extracts core SEO fields", () => {
    const html = `<!DOCTYPE html><html><head>
      <title>Test Page | WhereTo30A</title>
      <meta name="description" content="A test description for SEO audit parsing." />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href="https://whereto30a.com/test" />
      <meta property="og:title" content="OG Title" />
      <meta property="og:description" content="OG Desc" />
      <meta property="og:image" content="https://whereto30a.com/og.jpg" />
      <meta name="twitter:card" content="summary_large_image" />
      <script type="application/ld+json">{"@type":"WebPage","name":"Test"}</script>
    </head><body>
      <h1>Hello World</h1>
      <p>${"word ".repeat(50)}</p>
      <a href="/restaurants">Restaurants</a>
      <a href="https://example.com">External</a>
      <img src="/a.jpg" alt="Photo" />
      <img src="/b.jpg" />
    </body></html>`;

    const p = parsePageHtml(html, "https://whereto30a.com/test");
    expect(p.title).toContain("Test Page");
    expect(p.metaDescription).toContain("test description");
    expect(p.canonicalHref).toBe("https://whereto30a.com/test");
    expect(p.h1Texts).toEqual(["Hello World"]);
    expect(p.ogTitle).toBe("OG Title");
    expect(p.jsonLdBlocks).toHaveLength(1);
    expect(p.internalLinks.some((l) => l.includes("/restaurants"))).toBe(true);
    expect(p.externalLinks.some((l) => l.includes("example.com"))).toBe(true);
    expect(p.imageAlts.filter((i) => !i.alt?.trim())).toHaveLength(1);
    expect(p.wordCount).toBeGreaterThan(40);
  });
});
