import { analyzePage, analyzeSiteWide, sitemapViolationsFromUrls } from "./analyze";
import { auditBusinessIndexability } from "./business-indexability";
import { extractCrawlQueue, fetchPage } from "./crawl";
import { normalizeAuditUrl } from "./page-kind";
import { buildAuditSummary, renderAuditMarkdown } from "./report";
import { runPool } from "./run-pool";
import { collectSeedUrls } from "./seed-urls";
import { analyzeHomePageJsonLd } from "./site-wide-checks";
import type { AuditIssue, CrawledPage, RunSiteAuditOptions, SiteAuditReport } from "./types";

export type RobotsTxtInfo = {
  disallow: string[];
  sitemap: string | null;
};

export function parseRobotsTxt(body: string): RobotsTxtInfo {
  const disallow: string[] = [];
  let sitemap: string | null = null;
  let inStar = false;

  for (const rawLine of body.split("\n")) {
    const line = rawLine.split("#")[0]?.trim() ?? "";
    if (!line) continue;
    const lower = line.toLowerCase();
    if (lower.startsWith("user-agent:")) {
      const agent = line.slice("user-agent:".length).trim();
      inStar = agent === "*";
      continue;
    }
    if (!inStar) continue;
    if (lower.startsWith("disallow:")) {
      const path = line.slice("disallow:".length).trim();
      if (path) disallow.push(path);
    }
    if (lower.startsWith("sitemap:")) {
      sitemap = line.slice("sitemap:".length).trim();
    }
  }

  return { disallow, sitemap };
}

export async function fetchRobotsInfo(baseUrl: string, fetchFn: typeof fetch): Promise<RobotsTxtInfo> {
  try {
    const res = await fetchFn(`${baseUrl.replace(/\/$/, "")}/robots.txt`, { cache: "no-store" });
    if (!res.ok) return { disallow: [], sitemap: null };
    return parseRobotsTxt(await res.text());
  } catch {
    return { disallow: [], sitemap: null };
  }
}

export async function runSiteAudit(
  options: RunSiteAuditOptions & { supabase?: import("@supabase/supabase-js").SupabaseClient | null },
): Promise<SiteAuditReport> {
  const started = Date.now();
  const startedAt = new Date(started).toISOString();
  const baseUrl = options.baseUrl.replace(/\/$/, "");
  const fetchFn = options.fetchFn ?? fetch;
  const concurrency = options.concurrency ?? 8;
  const maxUrls = options.maxUrls ?? 2500;
  const maxDepth = options.maxDepth ?? 2;
  const timeBudgetMs = options.timeBudgetMs ?? 240_000;

  const [{ seedUrls, sitemapUrls }, robots, llmsRes] = await Promise.all([
    collectSeedUrls({
      baseUrl,
      fetchFn,
      supabase: options.supabase ?? null,
      includeBusinessUrls: options.includeBusinessUrls,
    }),
    fetchRobotsInfo(baseUrl, fetchFn),
    fetchFn(`${baseUrl}/llms.txt`, { cache: "no-store" }).catch(() => null),
  ]);

  const llmsTxtOk = llmsRes?.ok ?? false;
  let baseHost: string;
  try {
    baseHost = new URL(baseUrl).hostname;
  } catch {
    throw new Error(`Invalid baseUrl: ${baseUrl}`);
  }

  const queue: Array<{ url: string; depth: number }> = seedUrls.map((url) => ({ url, depth: 0 }));
  const queued = new Set(seedUrls);
  const pages: CrawledPage[] = [];

  while (queue.length > 0 && pages.length < maxUrls) {
    if (Date.now() - started > timeBudgetMs) break;

    const batchSize = Math.min(concurrency * 4, queue.length, maxUrls - pages.length);
    const batch = queue.splice(0, batchSize);

    const fetched = await runPool(batch, concurrency, async ({ url, depth }) =>
      fetchPage(url, fetchFn, depth),
    );

    for (const page of fetched) {
      pages.push(page);
      options.onProgress?.(pages.length, Math.min(queue.length + pages.length, maxUrls));

      for (const next of extractCrawlQueue(page, baseHost, robots.disallow, maxDepth)) {
        if (queued.has(next) || queued.size + queue.length >= maxUrls * 2) continue;
        queued.add(next);
        queue.push({ url: next, depth: page.crawlDepth + 1 });
      }
    }
  }

  const pageIssues = pages.flatMap((page) => analyzePage(page, baseUrl));
  const partialCrawl = pages.length < queued.size || Date.now() - started >= timeBudgetMs;
  const siteIssues = analyzeSiteWide({
    baseUrl,
    pages,
    sitemapUrls,
    seedUrls,
    robotsDisallow: robots.disallow,
    robotsSitemap: robots.sitemap,
    llmsTxtOk,
    sitemapViolations: sitemapViolationsFromUrls(baseUrl, sitemapUrls),
    partialCrawl,
  });

  const extraIssues: AuditIssue[] = [];
  const homeNorm = normalizeAuditUrl(baseUrl);
  const homePage = pages.find((p) => normalizeAuditUrl(p.finalUrl) === homeNorm);
  if (homePage?.html) {
    extraIssues.push(...analyzeHomePageJsonLd(homeNorm, homePage.html));
  } else {
    try {
      const res = await fetchFn(baseUrl, { headers: { Accept: "text/html" } });
      if (res.ok) extraIssues.push(...analyzeHomePageJsonLd(homeNorm, await res.text()));
    } catch {
      // home fetch failed — crawl errors cover this
    }
  }

  let businessIndexability: SiteAuditReport["businessIndexability"];
  if (options.supabase) {
    const { issues: bizIssues, stats } = await auditBusinessIndexability(options.supabase, baseUrl);
    extraIssues.push(...bizIssues);
    if (stats) {
      businessIndexability = { total: stats.total, indexReady: stats.indexReady };
    }
  }

  const issues = [...pageIssues, ...siteIssues, ...extraIssues];
  const urlsFailed = pages.filter((p) => p.status !== 200 || p.fetchError).length;
  const completedAt = new Date().toISOString();

  const summary = buildAuditSummary(issues, {
    urlsDiscovered: queued.size,
    urlsCrawled: pages.length,
    urlsFailed,
    durationMs: Date.now() - started,
  });

  const report: SiteAuditReport = {
    baseUrl,
    startedAt,
    completedAt,
    summary,
    issues,
    crawledUrls: pages.map((p) => normalizeAuditUrl(p.finalUrl)),
    sitemapUrls,
    seedUrls,
    businessIndexability,
  };

  return report;
}

export async function runSiteAuditWithMarkdown(
  options: RunSiteAuditOptions & { supabase?: import("@supabase/supabase-js").SupabaseClient | null },
): Promise<{ report: SiteAuditReport; markdown: string }> {
  const report = await runSiteAudit(options);
  return { report, markdown: renderAuditMarkdown(report) };
}

export { renderAuditMarkdown, buildAuditSummary };
