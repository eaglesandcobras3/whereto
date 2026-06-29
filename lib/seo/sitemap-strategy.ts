import type { MetadataRoute } from "next";
import {
  categoryHubPath,
  isCategoryHubPublicPath,
} from "@/lib/routes/category-hub-path";
import { SERVICE_VENDORS_HUB_PATH } from "@/lib/routes/service-vendors-hub";
import { isReservedRootSlug } from "@/lib/routes/reserved-slugs";
import { PRIMARY_REGION_DB_SLUG } from "@/lib/routes/primary-region";

/** Featured first-timer guide — canonical path (not `/guide` hub). */
export const PRIMARY_EDITORIAL_GUIDE_SLUG = "ultimate-30a-first-timers-guide" as const;

export const PRIMARY_EDITORIAL_GUIDE_PATH =
  `/guide/${PRIMARY_EDITORIAL_GUIDE_SLUG}` as const;

/** Paths excluded from sitemap (still live on site, crawlable via links). */
export const SITEMAP_EXCLUDED_PATH_PREFIXES = ["/business/"] as const;

export const SITEMAP_EXCLUDED_EXACT_PATHS = new Set([
  "/about",
  "/feedback",
  "/list-your-business",
  "/terms",
  "/privacy",
  "/guide",
  "/businesses",
]);

export const SITEMAP_HUB_PAGES = [
  { path: "/towns", priority: 0.9, changeFreq: "weekly" as const },
  { path: "/areas", priority: 0.9, changeFreq: "weekly" as const },
  { path: "/categories", priority: 0.9, changeFreq: "weekly" as const },
  { path: SERVICE_VENDORS_HUB_PATH, priority: 0.85, changeFreq: "weekly" as const },
  { path: "/guides", priority: 0.9, changeFreq: "weekly" as const },
] as const;

export const SITEMAP_HOME = {
  path: "/",
  priority: 1.0,
  changeFreq: "daily" as const,
} as const;

export type SitemapRow = Record<string, unknown>;

export type BuildSitemapInput = {
  base: string;
  now: Date;
  towns: SitemapRow[];
  guides: SitemapRow[];
  areas: SitemapRow[];
  categories: SitemapRow[];
  /** POIs resolve at `/area/[slug]` — deduped against areas. */
  pointsOfInterest?: SitemapRow[];
  /** When false, omit `/guides` hub and all `/guide/[slug]` URLs. */
  guidesEnabled?: boolean;
};

export function pathnameFromSitemapUrl(base: string, url: string): string {
  const normalizedBase = base.replace(/\/$/, "");
  if (!url.startsWith(normalizedBase)) return url;
  const path = url.slice(normalizedBase.length) || "/";
  return path.startsWith("/") ? path : `/${path}`;
}

export function isExcludedSitemapPath(pathname: string): boolean {
  if (SITEMAP_EXCLUDED_EXACT_PATHS.has(pathname)) return true;
  return SITEMAP_EXCLUDED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function shouldIncludeGuideInSitemap(guideSlug: string, townSlugs: Set<string>): boolean {
  if (!guideSlug.trim()) return false;
  if (townSlugs.has(guideSlug)) return false;
  return true;
}

export function pickSitemapDate(row: SitemapRow, fallback: Date): Date {
  for (const k of ["date_updated", "published_at", "starts_at", "date_created"]) {
    const v = row[k];
    if (typeof v === "string" && v) {
      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  return fallback;
}

export function dedupeSitemapByUrl(entries: MetadataRoute.Sitemap): MetadataRoute.Sitemap {
  const seen = new Set<string>();
  const out: MetadataRoute.Sitemap = [];
  for (const e of entries) {
    if (seen.has(e.url)) continue;
    seen.add(e.url);
    out.push(e);
  }
  return out;
}

/** Build index-focused sitemap entries (no business URLs, no utility pages). */
export function buildSitemapEntries(input: BuildSitemapInput): MetadataRoute.Sitemap {
  const {
    base,
    now,
    towns,
    guides,
    areas,
    categories,
    pointsOfInterest = [],
    guidesEnabled = true,
  } = input;
  const entries: MetadataRoute.Sitemap = [];

  entries.push({
    url: `${base}${SITEMAP_HOME.path}`,
    lastModified: now,
    changeFrequency: SITEMAP_HOME.changeFreq,
    priority: SITEMAP_HOME.priority,
  });

  for (const hub of SITEMAP_HUB_PAGES) {
    if (!guidesEnabled && hub.path === "/guides") continue;
    entries.push({
      url: `${base}${hub.path}`,
      lastModified: now,
      changeFrequency: hub.changeFreq,
      priority: hub.priority,
    });
  }

  const townSlugs = new Set<string>();
  for (const t of towns) {
    const slug = String(t.slug ?? "").trim();
    if (!slug || isReservedRootSlug(slug) || slug === PRIMARY_REGION_DB_SLUG) continue;
    townSlugs.add(slug);
    entries.push({
      url: `${base}/${slug}`,
      lastModified: pickSitemapDate(t, now),
      changeFrequency: "weekly",
      priority: 0.85,
    });
  }

  for (const g of guides) {
    if (!guidesEnabled) break;
    const slug = String(g.slug ?? "").trim();
    if (!shouldIncludeGuideInSitemap(slug, townSlugs)) continue;
    entries.push({
      url: `${base}/guide/${slug}`,
      lastModified: pickSitemapDate(g, now),
      changeFrequency: "monthly",
      priority: 0.8,
    });
  }

  for (const cat of categories) {
    const slug = String(cat.slug ?? "").trim();
    if (!slug) continue;
    entries.push({
      url: `${base}${categoryHubPath(slug)}`,
      lastModified: pickSitemapDate(cat, now),
      changeFrequency: "weekly",
      priority: 0.75,
    });
  }

  const areaUrlsEmitted = new Set<string>();
  for (const a of areas) {
    const slug = String(a.slug ?? "").trim();
    if (!slug) continue;
    const url = `${base}/area/${slug}`;
    areaUrlsEmitted.add(url);
    entries.push({
      url,
      lastModified: pickSitemapDate(a, now),
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  for (const poi of pointsOfInterest) {
    const slug = String(poi.slug ?? "").trim();
    if (!slug) continue;
    const url = `${base}/area/${slug}`;
    if (areaUrlsEmitted.has(url)) continue;
    areaUrlsEmitted.add(url);
    entries.push({
      url,
      lastModified: pickSitemapDate(poi, now),
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  return dedupeSitemapByUrl(entries).filter((e) => {
    const path = pathnameFromSitemapUrl(base, e.url);
    return !isExcludedSitemapPath(path);
  });
}

export function staticFallbackSitemap(
  base: string,
  now: Date,
  guidesEnabled = true,
): MetadataRoute.Sitemap {
  return buildSitemapEntries({
    base,
    now,
    towns: [],
    guides: guidesEnabled ? [{ slug: "ultimate-30a-first-timers-guide" }] : [],
    areas: [],
    categories: [],
    guidesEnabled,
  });
}
