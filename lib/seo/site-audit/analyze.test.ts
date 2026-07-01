import { describe, expect, it } from "vitest";
import { analyzePage } from "./analyze";
import { classifyPageKind } from "./page-kind";
import type { CrawledPage } from "./types";

describe("classifyPageKind", () => {
  it("detects business and browse group paths", () => {
    expect(classifyPageKind("/business/foo")).toBe("business");
    expect(classifyPageKind("/categories/restaurants-and-bars")).toBe("browse_group");
    expect(classifyPageKind("/services/home-trades")).toBe("service_group");
    expect(classifyPageKind("/restaurants")).toBe("category_hub");
    expect(classifyPageKind("/seaside")).toBe("town");
  });
});

describe("analyzePage", () => {
  it("flags missing canonical on indexable pages", () => {
    const page: CrawledPage = {
      url: "https://whereto30a.com/business/foo",
      finalUrl: "https://whereto30a.com/business/foo",
      status: 200,
      redirectHops: 0,
      kind: "business",
      crawlDepth: 0,
      html: "<html><head><title>Foo</title></head><body><h1>Foo</h1></body></html>",
      parsed: {
        title: "Foo",
        metaDescription: null,
        robotsMeta: null,
        canonicalHref: null,
        h1Texts: ["Foo"],
        ogTitle: null,
        ogDescription: null,
        ogImage: null,
        ogUrl: null,
        twitterCard: null,
        twitterTitle: null,
        twitterImage: null,
        jsonLdBlocks: [],
        internalLinks: [],
        externalLinks: [],
        imageAlts: [],
        wordCount: 5,
        htmlBytes: 100,
        bodyContentHtmlBytes: 80,
      },
    };

    const issues = analyzePage(page, "https://whereto30a.com");
    expect(issues.some((i) => i.rule === "missing_canonical")).toBe(true);
    expect(issues.some((i) => i.rule === "thin_content")).toBe(true);
  });

  it("does not flag text ratio when framework scripts inflate full HTML bytes", () => {
    const page: CrawledPage = {
      url: "https://whereto30a.com/seaside",
      finalUrl: "https://whereto30a.com/seaside",
      status: 200,
      redirectHops: 0,
      kind: "town",
      crawlDepth: 0,
      html: "<html><body><h1>Seaside</h1></body></html>",
      parsed: {
        title: "Seaside",
        metaDescription: "Town guide",
        robotsMeta: null,
        canonicalHref: "https://whereto30a.com/seaside",
        h1Texts: ["Seaside"],
        ogTitle: null,
        ogDescription: null,
        ogImage: null,
        ogUrl: null,
        twitterCard: null,
        twitterTitle: null,
        twitterImage: null,
        jsonLdBlocks: [],
        internalLinks: [],
        externalLinks: [],
        imageAlts: [],
        wordCount: 400,
        htmlBytes: 2_000_000,
        bodyContentHtmlBytes: 40_000,
      },
    };

    const issues = analyzePage(page, "https://whereto30a.com");
    expect(issues.some((i) => i.rule === "low_text_html_ratio")).toBe(false);
  });
});
