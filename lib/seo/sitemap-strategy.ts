import type { MetadataRoute } from "next";
import {
  businessBrowseGroupHubPath,
} from "@/lib/business-categories/browse-group-nav";
import { BUSINESS_CATEGORY_GROUP_SLUGS } from "@/lib/business-categories/groups";
import {
  categoryHubPath,
  isCategoryHubPublicPath,
} from "@/lib/routes/category-hub-path";
import { isReservedRootSlug } from "@/lib/routes/reserved-slugs";
import { PRIMARY_REGION_DB_SLUG } from "@/lib/routes/primary-region";
import { townPagePath } from "@/lib/routes/town-page-path";
import { unifiedRollupHubPath, listUnifiedRollupOrder } from "@/lib/categories/unified-browse";

/** Featured first-timer guide — canonical path (not `/guide` hub). */
export const PRIMARY_EDITORIAL_GUIDE_SLUG = "ultimate-30a-first-timers-guide" as const;

export const PRIMARY_EDITORIAL_GUIDE_PATH =
  `/guide/${PRIMARY_EDITORIAL_GUIDE_SLUG}` as const;

export {
  BEACH_ACCESS_PILLAR_GUIDE_PATH,
  BEACH_ACCESS_PILLAR_GUIDE_SLUG,
} from "@/lib/seo/retired-guide-redirects";

/** Paths excluded from sitemap (still live on site, crawlable via links). */
export const SITEMAP_EXCLUDED_PATH_PREFIXES = ["/business/"] as const;

/** Rolled-up storefront and service browse groups (e.g. `/businesses/restaurants-and-bars`). */
export const SITEMAP_BROWSE_GROUP_ENTRY = {
  changeFreq: "weekly" as const,
  priority: 0.72,
} as const;

/** Canonical rollup browse group paths for the hub sitemap. */
export function listSitemapBrowseGroupPaths(): string[] {
  const legacy = BUSINESS_CATEGORY_GROUP_SLUGS.map((slug) => businessBrowseGroupHubPath(slug));
  const unified = listUnifiedRollupOrder().map((slug) => unifiedRollupHubPath(slug));
  return [...new Set([...unified, ...legacy])];
}

/** @deprecated Services hub redirects to /businesses — no separate sitemap entries. */
export function listSitemapServiceGroupPaths(): string[] {
  return [];
}

export const SITEMAP_EXCLUDED_EXACT_PATHS = new Set([
  "/about",
  "/feedback",
  "/list-your-business",
  "/list-your-rentals",
  "/terms",
  "/privacy",
  "/guide",
  "/services",
  "/categories",
]);

export const SITEMAP_HUB_PAGES = [
  { path: "/towns", priority: 0.9, changeFreq: "weekly" as const },
  { path: "/areas", priority: 0.9, changeFreq: "weekly" as const },
  { path: "/businesses", priority: 0.9, changeFreq: "weekly" as const },
  { path: "/guides", priority: 0.9, changeFreq: "weekly" as const },
] as const;

/** Vacation-rentals hub — only emit when rentals are feature-enabled in production. */
export const SITEMAP_STAYS_HUB = {
  path: "/stays",
  priority: 0.88,
  changeFreq: "daily" as const,
} as const;

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
  /** When set, only these browse-group paths are emitted (non-empty rollups). */
  browseGroupPaths?: string[];
  /** POIs resolve at `/area/[slug]` — deduped against areas. */
  pointsOfInterest?: SitemapRow[];
  events?: SitemapRow[];
  /**
   * When true, include `/stays` hub + rental property/town URLs.
   * Keep false while the rentals feature flag is off so the sitemap does not
   * advertise URLs that middleware redirects to `/`.
   */
  includeRentals?: boolean;
  /** Index-eligible vacation rentals (`/stays/[slug]`). Ignored unless `includeRentals`. */
  rentals?: SitemapRow[];
  /** Town hubs with enough inventory (`/stays/town/[slug]`). Ignored unless `includeRentals`. */
  rentalTownHubs?: SitemapRow[];
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
    browseGroupPaths,
    pointsOfInterest = [],
    events = [],
    includeRentals = false,
    rentals = [],
    rentalTownHubs = [],
  } = input;
  const entries: MetadataRoute.Sitemap = [];

  entries.push({
    url: `${base}${SITEMAP_HOME.path}`,
    lastModified: now,
    changeFrequency: SITEMAP_HOME.changeFreq,
    priority: SITEMAP_HOME.priority,
  });

  for (const hub of SITEMAP_HUB_PAGES) {
    entries.push({
      url: `${base}${hub.path}`,
      lastModified: now,
      changeFrequency: hub.changeFreq,
      priority: hub.priority,
    });
  }

  if (includeRentals) {
    entries.push({
      url: `${base}${SITEMAP_STAYS_HUB.path}`,
      lastModified: now,
      changeFrequency: SITEMAP_STAYS_HUB.changeFreq,
      priority: SITEMAP_STAYS_HUB.priority,
    });
  }

  const rollupPaths = browseGroupPaths ?? listSitemapBrowseGroupPaths();
  for (const path of rollupPaths) {
    entries.push({
      url: `${base}${path}`,
      lastModified: now,
      changeFrequency: SITEMAP_BROWSE_GROUP_ENTRY.changeFreq,
      priority: SITEMAP_BROWSE_GROUP_ENTRY.priority,
    });
  }

  for (const path of listSitemapServiceGroupPaths()) {
    entries.push({
      url: `${base}${path}`,
      lastModified: now,
      changeFrequency: SITEMAP_BROWSE_GROUP_ENTRY.changeFreq,
      priority: SITEMAP_BROWSE_GROUP_ENTRY.priority,
    });
  }

  const townSlugs = new Set<string>();
  for (const t of towns) {
    const slug = String(t.slug ?? "").trim();
    if (!slug || isReservedRootSlug(slug) || slug === PRIMARY_REGION_DB_SLUG) continue;
    townSlugs.add(slug);
    entries.push({
      url: `${base}${townPagePath(slug)}`,
      lastModified: pickSitemapDate(t, now),
      changeFrequency: "weekly",
      priority: 0.85,
    });
  }

  for (const g of guides) {
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

  for (const ev of events) {
    const slug = String(ev.slug ?? "").trim();
    if (!slug) continue;
    entries.push({
      url: `${base}/events/${slug}`,
      lastModified: pickSitemapDate(ev, now),
      changeFrequency: "weekly",
      priority: 0.65,
    });
  }

  if (includeRentals) {
    for (const r of rentals) {
      const slug = String(r.slug ?? "").trim();
      if (!slug) continue;
      entries.push({
        url: `${base}/stays/${encodeURIComponent(slug)}`,
        lastModified: pickSitemapDate(r, now),
        changeFrequency: "weekly",
        priority: 0.78,
      });
    }

    for (const hub of rentalTownHubs) {
      const slug = String(hub.slug ?? "").trim();
      if (!slug) continue;
      entries.push({
        url: `${base}/stays/town/${encodeURIComponent(slug)}`,
        lastModified: pickSitemapDate(hub, now),
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  }

  return dedupeSitemapByUrl(entries).filter((e) => {
    const path = pathnameFromSitemapUrl(base, e.url);
    return !isExcludedSitemapPath(path);
  });
}

export function staticFallbackSitemap(
  base: string,
  now: Date,
): MetadataRoute.Sitemap {
  return buildSitemapEntries({
    base,
    now,
    towns: [],
    guides: [{ slug: "ultimate-30a-first-timers-guide" }],
    areas: [],
    categories: [],
  });
}
