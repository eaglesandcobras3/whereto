import { describe, expect, it } from "vitest";
import { analyzeHomePageJsonLd } from "./site-wide-checks";

describe("analyzeHomePageJsonLd", () => {
  it("flags SearchAction pointing at /ask", () => {
    const html = `<!DOCTYPE html><html><head>
      <script type="application/ld+json">{
        "@context": "https://schema.org",
        "@type": "WebSite",
        "potentialAction": {
          "@type": "SearchAction",
          "target": { "@type": "EntryPoint", "urlTemplate": "https://whereto30a.com/ask?q={search_term_string}" }
        }
      }</script>
      <script type="application/ld+json">{"@type":"Organization","name":"WhereTo30A"}</script>
    </head><body></body></html>`;

    const issues = analyzeHomePageJsonLd("https://whereto30a.com/", html);
    expect(issues.some((i) => i.rule === "search_action_noindex_target")).toBe(true);
  });
});
