import { isCategoryHubPublicPath } from "@/lib/routes/category-hub-path";
import { businessBrowseGroupFromPublicSegment } from "@/lib/business-categories/browse-group-nav";
import { serviceBrowseGroupFromPublicSegment } from "@/lib/service-categories/browse-group-nav";
import { SERVICE_VENDORS_HUB_PATH } from "@/lib/routes/service-vendors-hub";
import { townPagePath } from "@/lib/routes/town-page-path";
import {
  PRIMARY_EDITORIAL_GUIDE_PATH,
  PRIMARY_EDITORIAL_GUIDE_SLUG,
  listSitemapBrowseGroupPaths,
  listSitemapServiceGroupPaths,
  isExcludedSitemapPath,
  pathnameFromSitemapUrl,
} from "@/lib/seo/sitemap-strategy";

export type SitemapRuleViolation = {
  rule: string;
  url?: string;
  detail: string;
};

export function parseSitemapLocs(xml: string): string[] {
  const locs: string[] = [];
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    locs.push(m[1].trim());
  }
  return locs;
}

export function isSitemapBrowseGroupPath(pathname: string): boolean {
  if (!pathname.startsWith("/categories/")) return false;
  const segment = pathname.split("/")[2] ?? "";
  return businessBrowseGroupFromPublicSegment(segment) !== null;
}

export function isSitemapServiceGroupPath(pathname: string): boolean {
  if (!pathname.startsWith(`${SERVICE_VENDORS_HUB_PATH}/`)) return false;
  const segment = pathname.split("/")[2] ?? "";
  return serviceBrowseGroupFromPublicSegment(segment) !== null;
}

/** Structural rules for hub-focused sitemap (no HTTP). */
export function validateSitemapStructure(base: string, urls: string[]): SitemapRuleViolation[] {
  const violations: SitemapRuleViolation[] = [];
  const paths = urls.map((u) => pathnameFromSitemapUrl(base, u));
  const pathSet = new Set(paths);

  for (const url of urls) {
    const path = pathnameFromSitemapUrl(base, url);
    if (path.startsWith("/business/")) {
      violations.push({
        rule: "no-business-urls",
        url,
        detail: "Business URLs must not appear in sitemap",
      });
    }
    if (isExcludedSitemapPath(path)) {
      violations.push({
        rule: "no-excluded-paths",
        url,
        detail: `Utility or legacy path must not appear: ${path}`,
      });
    }
  }

  const hasGuideUrls =
    pathSet.has("/guides") || paths.some((p) => p.startsWith("/guide/"));

  if (hasGuideUrls) {
    if (!pathSet.has("/guides")) {
      violations.push({ rule: "guides-hub", detail: "Missing /guides hub" });
    }
    if (pathSet.has("/guide")) {
      violations.push({
        rule: "no-standalone-guide",
        detail: "Standalone /guide must not appear (use editorial slug URL)",
      });
    }
    if (!pathSet.has(PRIMARY_EDITORIAL_GUIDE_PATH)) {
      violations.push({
        rule: "primary-editorial-guide",
        detail: `Missing ${PRIMARY_EDITORIAL_GUIDE_PATH}`,
      });
    }
  }

  const requiredHubs = ["/towns", "/areas", "/categories", SERVICE_VENDORS_HUB_PATH];
  for (const hub of requiredHubs) {
    if (!pathSet.has(hub)) {
      violations.push({ rule: "hub-pages", detail: `Missing hub ${hub}` });
    }
  }

  const hasTown = paths.some((p) => p.startsWith("/town/"));
  if (!hasTown) {
    violations.push({ rule: "town-pages", detail: "Expected at least one town page" });
  }
  if (!paths.some((p) => p.startsWith("/area/"))) {
    violations.push({ rule: "area-pages", detail: "Expected at least one /area/ page" });
  }
  if (!paths.some((p) => p.startsWith("/guide/") && p !== PRIMARY_EDITORIAL_GUIDE_PATH)) {
    // optional - might only have one guide in staging
  }
  const otherGuides = paths.filter(
    (p) => p.startsWith("/guide/") && p !== PRIMARY_EDITORIAL_GUIDE_PATH,
  );
  const townPaths = new Set(
    paths.filter((p) => p.startsWith("/town/")),
  );
  for (const guidePath of otherGuides) {
    const slug = guidePath.replace("/guide/", "");
    if (townPaths.has(townPagePath(slug))) {
      violations.push({
        rule: "no-duplicate-town-guide",
        detail: `Guide duplicates town hub: ${guidePath}`,
      });
    }
  }

  if (!paths.some((p) => isCategoryHubPublicPath(p))) {
    violations.push({
      rule: "category-pages",
      detail: "Expected at least one category hub (e.g. /restaurants)",
    });
  }

  for (const path of paths) {
    if (!path.startsWith("/categories/") || path === "/categories") continue;
    if (!isSitemapBrowseGroupPath(path)) {
      violations.push({
        rule: "no-legacy-category-urls",
        url: `${base}${path}`,
        detail: `Legacy /categories/[slug] URLs must not appear in sitemap: ${path}`,
      });
    }
  }

  for (const path of paths) {
    if (!path.startsWith(`${SERVICE_VENDORS_HUB_PATH}/`)) continue;
    if (!isSitemapServiceGroupPath(path)) {
      violations.push({
        rule: "no-invalid-service-group-urls",
        url: `${base}${path}`,
        detail: `Only rollup service group URLs are allowed under ${SERVICE_VENDORS_HUB_PATH}/: ${path}`,
      });
    }
  }

  for (const requiredPath of listSitemapBrowseGroupPaths()) {
    if (!pathSet.has(requiredPath)) {
      violations.push({
        rule: "browse-group-pages",
        detail: `Missing rollup browse group ${requiredPath}`,
      });
    }
  }

  for (const requiredPath of listSitemapServiceGroupPaths()) {
    if (!pathSet.has(requiredPath)) {
      violations.push({
        rule: "service-group-pages",
        detail: `Missing rollup service group ${requiredPath}`,
      });
    }
  }

  if (paths.some((p) => p.endsWith("-on-30a") && p.split("/").filter(Boolean).length === 1)) {
    violations.push({
      rule: "no-legacy-on-30a-category-urls",
      detail: "Legacy *-on-30a category URLs must not appear in sitemap",
    });
  }

  return violations;
}

/** Fetch sitemap.xml and return page URLs. */
export async function collectSitemapPageUrls(
  sitemapUrl: string,
  fetchFn: typeof fetch = fetch,
): Promise<string[]> {
  const res = await fetchFn(sitemapUrl, { cache: "no-store" });
  if (!res.ok) return [];
  const xml = await res.text();
  return parseSitemapLocs(xml);
}

export type LiveUrlCheckResult = {
  url: string;
  ok: boolean;
  status?: number;
  errors: string[];
};

export function extractCanonicalHref(html: string): string | null {
  const match = html.match(
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i,
  );
  return match?.[1]?.trim() ?? null;
}

export function isNoindexHtml(html: string): boolean {
  const robotsMeta = html.match(
    /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["'][^>]*>/i,
  );
  const content = robotsMeta?.[1]?.toLowerCase() ?? "";
  return content.includes("noindex");
}

export async function checkSitemapUrlLive(
  url: string,
  fetchFn: typeof fetch = fetch,
): Promise<LiveUrlCheckResult> {
  const errors: string[] = [];
  let status: number | undefined;

  try {
    const res = await fetchFn(url, {
      redirect: "follow",
      headers: { Accept: "text/html" },
    });
    status = res.status;
    if (status !== 200) {
      errors.push(`HTTP ${status}`);
      return { url, ok: false, status, errors };
    }

    const html = await res.text();
    if (isNoindexHtml(html)) {
      errors.push("Page has noindex");
    }

    const canonical = extractCanonicalHref(html);
    if (!canonical) {
      errors.push("Missing canonical link");
    } else {
      const normalizedCanonical = canonical.replace(/\/$/, "");
      const normalizedUrl = url.replace(/\/$/, "");
      if (normalizedCanonical !== normalizedUrl) {
        errors.push(`Canonical mismatch: ${canonical}`);
      }
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  return { url, ok: errors.length === 0, status, errors };
}

export { PRIMARY_EDITORIAL_GUIDE_SLUG };
