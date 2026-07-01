import {
  extractCanonicalHref,
  isNoindexHtml,
  validateSitemapStructure,
  type SitemapRuleViolation,
} from "@/lib/seo/validate-sitemap-urls";
import type { CrawledPage, AuditIssue, ParsedPageHtml, PageKind } from "./types";
import {
  classifyPageKind,
  isIndexableKind,
  normalizeAuditUrl,
  pathnameFromUrl,
  shouldCrawlUrl,
} from "./page-kind";

const TITLE_MAX = 60;
const TITLE_MIN = 15;
const META_MAX = 160;
const META_MIN = 70;
const THIN_WORD_COUNT = 200;
const MAX_HTML_BYTES = 1_500_000;
/** Words per KB of visible body markup (framework scripts excluded). */
const TEXT_HTML_RATIO_MIN = 0.5;

const EXPECTED_JSON_LD: Partial<Record<PageKind, string[]>> = {
  business: ["LocalBusiness", "Organization", "BreadcrumbList"],
  town: ["TouristDestination", "BreadcrumbList"],
  area: ["Place", "BreadcrumbList"],
  guide: ["Article", "BreadcrumbList"],
  category_hub: ["ItemList", "BreadcrumbList"],
  browse_group: ["ItemList", "BreadcrumbList"],
  service_group: ["ItemList", "BreadcrumbList"],
  seo_intent: ["ItemList", "BreadcrumbList"],
  event: ["Event", "BreadcrumbList"],
};

function normalizedCanonical(url: string, href: string | null): string | null {
  if (!href) return null;
  try {
    return normalizeAuditUrl(new URL(href, url).toString());
  } catch {
    return null;
  }
}

function parseJsonLdTypes(blocks: string[]): string[] {
  const types: string[] = [];
  for (const block of blocks) {
    try {
      const data = JSON.parse(block) as unknown;
      collectSchemaTypes(data, types);
    } catch {
      types.push("__INVALID_JSON__");
    }
  }
  return types;
}

function collectSchemaTypes(node: unknown, out: string[]): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectSchemaTypes(item, out);
    return;
  }
  const obj = node as Record<string, unknown>;
  const t = obj["@type"];
  if (typeof t === "string") out.push(t);
  if (Array.isArray(t)) {
    for (const item of t) {
      if (typeof item === "string") out.push(item);
    }
  }
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") collectSchemaTypes(value, out);
  }
}

export function analyzePage(page: CrawledPage, baseUrl: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const url = page.url;
  const indexable = isIndexableKind(page.kind);

  if (page.fetchError) {
    issues.push({
      severity: "error",
      category: "indexability",
      rule: "fetch_failed",
      url,
      detail: page.fetchError,
    });
    return issues;
  }

  if (page.status >= 400) {
    issues.push({
      severity: "error",
      category: "indexability",
      rule: "http_error",
      url,
      detail: `HTTP ${page.status}`,
    });
    return issues;
  }

  if (page.status >= 300 && page.status < 400) {
    issues.push({
      severity: "warning",
      category: "indexability",
      rule: "http_redirect",
      url,
      detail: `HTTP ${page.status} (final: ${page.finalUrl})`,
    });
  }

  if (page.redirectHops > 2) {
    issues.push({
      severity: "warning",
      category: "links",
      rule: "redirect_chain_long",
      url,
      detail: `${page.redirectHops} redirect hops`,
    });
  }

  if (!page.parsed || !page.html) return issues;

  const p = page.parsed;

  if (p.htmlBytes > MAX_HTML_BYTES) {
    issues.push({
      severity: "notice",
      category: "technical",
      rule: "html_large",
      url,
      detail: `HTML payload ${Math.round(p.htmlBytes / 1024)}KB`,
    });
  }

  const noindex = p.robotsMeta?.includes("noindex") || isNoindexHtml(page.html);
  if (indexable && noindex) {
    issues.push({
      severity: "error",
      category: "indexability",
      rule: "unexpected_noindex",
      url,
      detail: `Indexable page type (${page.kind}) has noindex`,
    });
  }
  if (!indexable && !noindex && page.status === 200) {
    issues.push({
      severity: "notice",
      category: "indexability",
      rule: "missing_noindex_utility",
      url,
      detail: `Utility/other page may need noindex (${page.kind})`,
    });
  }

  const canonical = normalizedCanonical(url, p.canonicalHref);
  if (indexable && !canonical) {
    issues.push({
      severity: "error",
      category: "indexability",
      rule: "missing_canonical",
      url,
      detail: "No canonical link element",
    });
  } else if (canonical && normalizeAuditUrl(page.finalUrl) !== canonical) {
    issues.push({
      severity: "error",
      category: "indexability",
      rule: "canonical_mismatch",
      url,
      detail: `Canonical ${p.canonicalHref} does not match final URL ${page.finalUrl}`,
    });
  }

  if (indexable) {
    issues.push(...analyzeContent(url, p));
    issues.push(...analyzeSocial(url, p));
    issues.push(...analyzeStructuredData(url, page.kind, p));
    issues.push(...analyzeImages(url, p));
  }

  for (const link of p.internalLinks) {
    if (link.startsWith("http://")) {
      issues.push({
        severity: "warning",
        category: "links",
        rule: "insecure_internal_link",
        url,
        detail: `Internal link uses HTTP: ${link}`,
      });
    }
  }

  return issues;
}

function analyzeContent(url: string, p: ParsedPageHtml): AuditIssue[] {
  const issues: AuditIssue[] = [];

  if (!p.title?.trim()) {
    issues.push({
      severity: "error",
      category: "content",
      rule: "title_missing",
      url,
      detail: "Missing <title>",
    });
  } else {
    const len = p.title.length;
    if (len < TITLE_MIN) {
      issues.push({
        severity: "warning",
        category: "content",
        rule: "title_too_short",
        url,
        detail: `Title length ${len} (target ≥${TITLE_MIN})`,
      });
    }
    if (len > TITLE_MAX) {
      issues.push({
        severity: "warning",
        category: "content",
        rule: "title_too_long",
        url,
        detail: `Title length ${len} (target ≤${TITLE_MAX}): "${p.title.slice(0, 80)}…"`,
      });
    }
  }

  if (!p.metaDescription?.trim()) {
    issues.push({
      severity: "warning",
      category: "content",
      rule: "meta_description_missing",
      url,
      detail: "Missing meta description",
    });
  } else {
    const len = p.metaDescription.length;
    if (len < META_MIN) {
      issues.push({
        severity: "warning",
        category: "content",
        rule: "meta_description_too_short",
        url,
        detail: `Meta description length ${len} (target ${META_MIN}–${META_MAX})`,
      });
    }
    if (len > META_MAX) {
      issues.push({
        severity: "warning",
        category: "content",
        rule: "meta_description_too_long",
        url,
        detail: `Meta description length ${len} (target ≤${META_MAX})`,
      });
    }
  }

  if (p.h1Texts.length === 0) {
    issues.push({
      severity: "warning",
      category: "content",
      rule: "h1_missing",
      url,
      detail: "No H1 found",
    });
  } else if (p.h1Texts.length > 1) {
    issues.push({
      severity: "notice",
      category: "content",
      rule: "h1_multiple",
      url,
      detail: `${p.h1Texts.length} H1 elements`,
    });
  }

  if (p.wordCount < THIN_WORD_COUNT) {
    issues.push({
      severity: "warning",
      category: "content",
      rule: "thin_content",
      url,
      detail: `~${p.wordCount} visible words (threshold ${THIN_WORD_COUNT})`,
    });
  }

  const markupKb = p.bodyContentHtmlBytes / 1024;
  const ratio = markupKb > 0 ? p.wordCount / markupKb : 0;
  if (p.wordCount > 0 && markupKb > 0 && ratio < TEXT_HTML_RATIO_MIN) {
    issues.push({
      severity: "notice",
      category: "content",
      rule: "low_text_html_ratio",
      url,
      detail: `Low text-to-HTML ratio (${ratio.toFixed(2)} words/KB body markup)`,
    });
  }

  return issues;
}

function analyzeSocial(url: string, p: ParsedPageHtml): AuditIssue[] {
  const issues: AuditIssue[] = [];
  if (!p.ogTitle) {
    issues.push({
      severity: "warning",
      category: "social",
      rule: "og_title_missing",
      url,
      detail: "Missing og:title",
    });
  }
  if (!p.ogDescription) {
    issues.push({
      severity: "notice",
      category: "social",
      rule: "og_description_missing",
      url,
      detail: "Missing og:description",
    });
  }
  if (!p.ogImage) {
    issues.push({
      severity: "warning",
      category: "social",
      rule: "og_image_missing",
      url,
      detail: "Missing og:image",
    });
  }
  if (!p.twitterCard) {
    issues.push({
      severity: "notice",
      category: "social",
      rule: "twitter_card_missing",
      url,
      detail: "Missing twitter:card",
    });
  }
  return issues;
}

function expectedJsonLdForPage(kind: PageKind, pageUrl: string): string[] | undefined {
  const path = pathnameFromUrl(pageUrl);
  if (path === "/businesses") {
    return ["BreadcrumbList", "ItemList"];
  }
  return EXPECTED_JSON_LD[kind];
}

function analyzeStructuredData(url: string, kind: PageKind, p: ParsedPageHtml): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const expected = expectedJsonLdForPage(kind, url);

  if (p.jsonLdBlocks.length === 0) {
    if (expected) {
      issues.push({
        severity: "warning",
        category: "structured_data",
        rule: "json_ld_missing",
        url,
        detail: `No JSON-LD (expected: ${expected.join(", ")})`,
      });
    }
    return issues;
  }

  const types = parseJsonLdTypes(p.jsonLdBlocks);
  if (types.includes("__INVALID_JSON__")) {
    issues.push({
      severity: "error",
      category: "structured_data",
      rule: "json_ld_invalid",
      url,
      detail: "Invalid JSON-LD block",
    });
  }

  if (expected) {
    const hasExpected = expected.some((t) => types.includes(t));
    if (!hasExpected) {
      issues.push({
        severity: "warning",
        category: "structured_data",
        rule: "json_ld_missing_type",
        url,
        detail: `Expected one of [${expected.join(", ")}]; found [${[...new Set(types)].join(", ")}]`,
      });
    }
  }

  return issues;
}

function analyzeImages(url: string, p: ParsedPageHtml): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const missingAlt = p.imageAlts.filter((img) => img.alt == null || img.alt.trim() === "");
  if (missingAlt.length > 0) {
    issues.push({
      severity: missingAlt.length > 3 ? "warning" : "notice",
      category: "images",
      rule: "img_missing_alt",
      url,
      detail: `${missingAlt.length} image(s) without alt text`,
    });
  }
  return issues;
}

export function analyzeSiteWide(input: {
  baseUrl: string;
  pages: CrawledPage[];
  sitemapUrls: string[];
  seedUrls: string[];
  robotsDisallow: string[];
  robotsSitemap: string | null;
  llmsTxtOk: boolean;
  sitemapViolations: SitemapRuleViolation[];
  /** When true, skip checks that require a full crawl (broken links to uncrawled URLs, orphan seeds). */
  partialCrawl?: boolean;
}): AuditIssue[] {
  const issues: AuditIssue[] = [];

  for (const v of input.sitemapViolations) {
    issues.push({
      severity: "error",
      category: "sitemap",
      rule: v.rule,
      url: v.url,
      detail: v.detail,
    });
  }

  const sitemapNorm = new Set(input.sitemapUrls.map(normalizeAuditUrl));
  const crawledOk = new Set(
    input.pages.filter((p) => p.status === 200).map((p) => normalizeAuditUrl(p.finalUrl)),
  );
  const crawledAttempted = new Set<string>();
  for (const p of input.pages) {
    crawledAttempted.add(normalizeAuditUrl(p.url));
    crawledAttempted.add(normalizeAuditUrl(p.finalUrl));
  }
  const failedUrls = new Set(
    input.pages
      .filter((p) => p.status >= 400 || p.fetchError)
      .map((p) => normalizeAuditUrl(p.url)),
  );

  if (!input.partialCrawl) {
    for (const seed of input.seedUrls) {
      const norm = normalizeAuditUrl(seed);
      const kind = classifyPathKind(norm);
      if (!isIndexableKind(kind)) continue;
      if (!crawledOk.has(norm)) {
        issues.push({
          severity: "error",
          category: "indexability",
          rule: "seed_url_not_crawled",
          url: norm,
          detail: "Seed URL was not successfully crawled",
        });
      }
    }
  }

  const indexableKinds = new Set<PageKind>([
    "home",
    "hub",
    "town",
    "area",
    "guide",
    "category_hub",
    "browse_group",
    "service_group",
    "business",
    "seo_intent",
    "event",
  ]);

  for (const page of input.pages) {
    if (page.status !== 200 || !indexableKinds.has(page.kind)) continue;
    const norm = normalizeAuditUrl(page.finalUrl);
    const path = pathnameFromUrl(norm);
    const inSitemap = sitemapNorm.has(norm);
    const shouldBeInSitemap =
      page.kind !== "business" &&
      page.kind !== "browse_group" &&
      page.kind !== "service_group" &&
      page.kind !== "seo_intent" &&
      page.kind !== "event" &&
      page.kind !== "utility" &&
      !path.startsWith("/business/");

    if (shouldBeInSitemap && !inSitemap) {
      issues.push({
        severity: "notice",
        category: "sitemap",
        rule: "indexable_not_in_sitemap",
        url: norm,
        detail: `Indexable ${page.kind} page not listed in sitemap.xml`,
      });
    }
  }

  const inbound = new Map<string, number>();
  for (const page of input.pages) {
    if (!page.parsed) continue;
    for (const link of page.parsed.internalLinks) {
      const norm = normalizeAuditUrl(link);
      inbound.set(norm, (inbound.get(norm) ?? 0) + 1);
    }
  }

  if (!input.partialCrawl) {
    for (const page of input.pages) {
      if (page.status !== 200 || !isIndexableKind(page.kind)) continue;
      const norm = normalizeAuditUrl(page.finalUrl);
      if (norm === normalizeAuditUrl(input.baseUrl)) continue;
      if ((inbound.get(norm) ?? 0) === 0) {
        issues.push({
          severity: "warning",
          category: "links",
          rule: "orphan_page",
          url: norm,
          detail: "No inbound internal links found during crawl",
        });
      }
    }
  }

  const titleMap = new Map<string, string[]>();
  const descMap = new Map<string, string[]>();
  for (const page of input.pages) {
    if (!page.parsed || page.status !== 200) continue;
    const norm = normalizeAuditUrl(page.finalUrl);
    if (page.parsed.title) {
      const key = page.parsed.title.trim().toLowerCase();
      const arr = titleMap.get(key) ?? [];
      arr.push(norm);
      titleMap.set(key, arr);
    }
    if (page.parsed.metaDescription) {
      const key = page.parsed.metaDescription.trim().toLowerCase();
      const arr = descMap.get(key) ?? [];
      arr.push(norm);
      descMap.set(key, arr);
    }
  }

  for (const [title, urls] of titleMap) {
    if (urls.length > 1) {
      issues.push({
        severity: "warning",
        category: "content",
        rule: "duplicate_title",
        detail: `Duplicate title "${title.slice(0, 60)}" on ${urls.length} pages: ${urls.slice(0, 4).join(", ")}${urls.length > 4 ? "…" : ""}`,
      });
    }
  }

  for (const [desc, urls] of descMap) {
    if (urls.length > 1) {
      issues.push({
        severity: "warning",
        category: "content",
        rule: "duplicate_meta_description",
        detail: `Duplicate meta description on ${urls.length} pages: ${urls.slice(0, 4).join(", ")}${urls.length > 4 ? "…" : ""}`,
      });
    }
  }

  for (const page of input.pages) {
    if (!page.parsed) continue;
    for (const link of page.parsed.internalLinks) {
      const norm = normalizeAuditUrl(link);
      const path = pathnameFromUrl(norm);
      if (!shouldCrawlUrl(path, input.robotsDisallow)) continue;
      if (!crawledAttempted.has(norm)) continue;
      if (failedUrls.has(norm) || !crawledOk.has(norm)) {
        issues.push({
          severity: "error",
          category: "links",
          rule: "broken_internal_link",
          url: page.finalUrl,
          detail: `Broken internal link to ${norm}`,
        });
      }
    }
  }

  if (input.robotsSitemap && !input.robotsSitemap.includes("/sitemap.xml")) {
    issues.push({
      severity: "warning",
      category: "technical",
      rule: "robots_missing_sitemap",
      detail: "robots.txt does not reference sitemap.xml",
    });
  }

  if (!input.llmsTxtOk) {
    issues.push({
      severity: "notice",
      category: "technical",
      rule: "llms_txt_missing",
      detail: "/llms.txt not reachable",
    });
  }

  if (!input.partialCrawl && input.sitemapUrls.length > 0) {
    for (const sitemapUrl of input.sitemapUrls) {
      const norm = normalizeAuditUrl(sitemapUrl);
      if (crawledOk.has(norm)) continue;
      const attempted = input.pages.find(
        (p) => normalizeAuditUrl(p.url) === norm || normalizeAuditUrl(p.finalUrl) === norm,
      );
      if (attempted) {
        issues.push({
          severity: "error",
          category: "sitemap",
          rule: "sitemap_url_not_indexable",
          url: norm,
          detail: `Sitemap URL returned HTTP ${attempted.status}${attempted.fetchError ? ` (${attempted.fetchError})` : ""}`,
        });
      } else {
        issues.push({
          severity: "error",
          category: "sitemap",
          rule: "sitemap_url_not_crawled",
          url: norm,
          detail: "Sitemap URL was not reached during crawl",
        });
      }
    }
  }

  return issues;
}

function classifyPathKind(url: string): PageKind {
  return classifyPageKind(pathnameFromUrl(url));
}

export function sitemapViolationsFromUrls(base: string, urls: string[]): SitemapRuleViolation[] {
  return validateSitemapStructure(base, urls);
}

export { extractCanonicalHref, isNoindexHtml };
