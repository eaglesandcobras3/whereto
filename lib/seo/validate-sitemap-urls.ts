import {
  PRIMARY_EDITORIAL_GUIDE_PATH,
  PRIMARY_EDITORIAL_GUIDE_SLUG,
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

/** Structural rules for index-focused sitemap (no HTTP). */
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

  const requiredHubs = ["/towns", "/areas", "/categories"];
  for (const hub of requiredHubs) {
    if (!pathSet.has(hub)) {
      violations.push({ rule: "hub-pages", detail: `Missing hub ${hub}` });
    }
  }

  const hasTown = paths.some(
    (p) =>
      p.split("/").length === 2 &&
      !p.startsWith("/guide/") &&
      !p.startsWith("/area/") &&
      !p.startsWith("/categories/") &&
      p !== "/" &&
      !requiredHubs.includes(p) &&
      !isExcludedSitemapPath(p),
  );
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
    paths.filter((p) => {
      const parts = p.split("/").filter(Boolean);
      return parts.length === 1 && !isExcludedSitemapPath(p) && !requiredHubs.includes(p);
    }),
  );
  for (const guidePath of otherGuides) {
    const slug = guidePath.replace("/guide/", "");
    if (townPaths.has(`/${slug}`)) {
      violations.push({
        rule: "no-duplicate-town-guide",
        detail: `Guide duplicates town hub: ${guidePath}`,
      });
    }
  }

  if (!paths.some((p) => p.startsWith("/categories/") && p !== "/categories")) {
    violations.push({ rule: "category-pages", detail: "Expected at least one /categories/ page" });
  }

  return violations;
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
