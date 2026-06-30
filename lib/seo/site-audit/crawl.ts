import { parsePageHtml } from "./parse-page-html";
import {
  classifyPageKind,
  normalizeAuditUrl,
  pathnameFromUrl,
  shouldCrawlUrl,
} from "./page-kind";
import type { CrawledPage } from "./types";

export type FetchPageResult = CrawledPage;

export async function fetchPage(
  url: string,
  fetchFn: typeof fetch,
  crawlDepth: number,
): Promise<FetchPageResult> {
  const normalized = normalizeAuditUrl(url);
  const kind = classifyPageKind(pathnameFromUrl(normalized));
  let redirectHops = 0;
  let current = normalized;

  try {
    for (let hop = 0; hop < 10; hop++) {
      const res = await fetchFn(current, {
        redirect: "manual",
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "WhereTo30A-SEO-Audit/1.0 (+https://whereto30a.com)",
        },
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) {
          return {
            url: normalized,
            finalUrl: current,
            status: res.status,
            redirectHops,
            kind,
            crawlDepth,
            fetchError: "Redirect without Location header",
          };
        }
        redirectHops++;
        current = normalizeAuditUrl(new URL(location, current).toString());
        continue;
      }

      const finalUrl = normalizeAuditUrl(res.url || current);
      const contentType = res.headers.get("content-type") ?? "";
      const isHtml = contentType.includes("text/html") || contentType.includes("application/xhtml");

      if (!isHtml) {
        return {
          url: normalized,
          finalUrl,
          status: res.status,
          redirectHops,
          kind: classifyPageKind(pathnameFromUrl(finalUrl)),
          crawlDepth,
          fetchError: `Non-HTML content-type: ${contentType || "unknown"}`,
        };
      }

      const html = await res.text();
      const parsed = res.status === 200 ? parsePageHtml(html, finalUrl) : undefined;

      return {
        url: normalized,
        finalUrl,
        status: res.status,
        redirectHops,
        html: res.status === 200 ? html : undefined,
        parsed,
        kind: classifyPageKind(pathnameFromUrl(finalUrl)),
        crawlDepth,
      };
    }

    return {
      url: normalized,
      finalUrl: current,
      status: 0,
      redirectHops,
      kind,
      crawlDepth,
      fetchError: "Too many redirects",
    };
  } catch (err) {
    return {
      url: normalized,
      finalUrl: current,
      status: 0,
      redirectHops,
      kind,
      crawlDepth,
      fetchError: err instanceof Error ? err.message : String(err),
    };
  }
}

export function extractCrawlQueue(
  page: FetchPageResult,
  baseHost: string,
  robotsDisallow: string[],
  maxDepth: number,
): string[] {
  if (page.crawlDepth >= maxDepth || !page.parsed || page.status !== 200) return [];
  const out: string[] = [];
  for (const link of page.parsed.internalLinks) {
    try {
      const u = new URL(link);
      if (u.hostname !== baseHost) continue;
      const path = u.pathname;
      if (!shouldCrawlUrl(path, robotsDisallow)) continue;
      out.push(normalizeAuditUrl(u.toString()));
    } catch {
      // skip
    }
  }
  return out;
}
