import type { MetadataRoute } from "next";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";
import { getSiteUrl } from "@/lib/site-url";
import { isReservedRootSlug } from "@/lib/routes/reserved-slugs";
import { PRIMARY_REGION_DB_SLUG, PRIMARY_REGION_HUB_PATH } from "@/lib/routes/primary-region";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";

/** PostgREST often caps a single response at ~1000 rows; paginate to include full catalogs. */
const SITEMAP_PAGE_SIZE = 1000;

/** Cache sitemap regeneration (seconds). Helps avoid hammering PostgREST on every crawler hit. */
export const revalidate = 3600;

const STATIC_PAGES = [
  { path: "/", priority: 1.0, changeFreq: "daily" as const },
  { path: "/guide", priority: 0.95, changeFreq: "weekly" as const },
  { path: "/guides", priority: 0.88, changeFreq: "weekly" as const },
  { path: PRIMARY_REGION_HUB_PATH, priority: 0.9, changeFreq: "weekly" as const },
  { path: "/businesses", priority: 0.88, changeFreq: "weekly" as const },
  { path: "/areas", priority: 0.85, changeFreq: "weekly" as const },
  { path: "/about", priority: 0.5, changeFreq: "monthly" as const },
  { path: "/feedback", priority: 0.4, changeFreq: "monthly" as const },
  { path: "/list-your-business", priority: 0.45, changeFreq: "monthly" as const },
  { path: "/terms", priority: 0.3, changeFreq: "yearly" as const },
  { path: "/privacy", priority: 0.3, changeFreq: "yearly" as const },
] as const;

function staticUrlsOnly(base: string, now: Date): MetadataRoute.Sitemap {
  return STATIC_PAGES.map((p) => ({
    url: `${base}${p.path}`,
    lastModified: now,
    changeFrequency: p.changeFreq,
    priority: p.priority,
  }));
}

/**
 * Comprehensive sitemap:
 * - Static pages
 * - Towns / businesses / guides / events / areas / POIs (published + browse-visible rows only)
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();
  try {
    const supabase = getServiceSupabaseOrNull();

    if (!supabase) {
      return staticUrlsOnly(base, now);
    }

    const [towns, businesses, guides, events, areas, pointsOfInterest, seoPages, categories] = await Promise.all([
      fetchBrowseableRows(supabase, "towns", "slug, date_updated, published_at, date_created"),
      fetchSitemapBusinessRows(supabase),
      fetchBrowseableRows(supabase, "guides", "slug, date_updated, published_at, date_created"),
      fetchBrowseableRows(supabase, "events", "slug, date_updated, published_at, date_created, starts_at"),
      fetchBrowseableRows(supabase, "areas", "slug, date_updated, published_at, date_created"),
      fetchBrowseableRows(
        supabase,
        "points_of_interest",
        "slug, date_updated, published_at, date_created",
      ),
      fetchSeoPageRows(supabase),
      fetchBrowseableRows(supabase, "business_categories", "slug, date_updated, published_at, date_created"),
    ]);

    const entries: MetadataRoute.Sitemap = [];

    entries.push({
      url: `${base}/categories`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    });

    for (const p of STATIC_PAGES) {
      entries.push({
        url: `${base}${p.path}`,
        lastModified: now,
        changeFrequency: p.changeFreq,
        priority: p.priority,
      });
    }

    for (const t of towns ?? []) {
      const slug = t.slug as string;
      if (!slug || isReservedRootSlug(slug) || slug === PRIMARY_REGION_DB_SLUG) continue;
      entries.push({
        url: `${base}/${slug}`,
        lastModified: pickDate(t, now),
        changeFrequency: "weekly",
        priority: 0.85,
      });
    }

    entries.push(...buildBusinessSitemapEntries(base, businesses ?? [], now));

    for (const g of guides ?? []) {
      const slug = g.slug as string;
      if (!slug) continue;
      entries.push({
        url: `${base}/guide/${slug}`,
        lastModified: pickDate(g, now),
        changeFrequency: "monthly",
        priority: 0.75,
      });
    }

    for (const e of events ?? []) {
      const slug = e.slug as string;
      if (!slug) continue;
      const eventDate = pickDate(e, now);
      const isUpcoming = eventDate > now;
      entries.push({
        url: `${base}/events/${slug}`,
        lastModified: eventDate,
        changeFrequency: "weekly",
        priority: isUpcoming ? 0.7 : 0.5,
      });
    }

    for (const a of areas ?? []) {
      const slug = a.slug as string;
      if (!slug) continue;
      entries.push({
        url: `${base}/area/${slug}`,
        lastModified: pickDate(a, now),
        changeFrequency: "monthly",
        priority: 0.65,
      });
    }

    // Matches `/area/[slug]` resolver: POIs resolve on the same path as areas — dedupe skips URLs already emitted for areas above.
    for (const poi of pointsOfInterest ?? []) {
      const slug = poi.slug as string;
      if (!slug) continue;
      entries.push({
        url: `${base}/area/${slug}`,
        lastModified: pickDate(poi, now),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }

    for (const cat of categories ?? []) {
      const slug = cat.slug as string;
      if (!slug) continue;
      entries.push({
        url: `${base}/categories/${slug}`,
        lastModified: pickDate(cat, now),
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }

    // SEO intent pages: /{townSlug}/{intentSlug} (e.g. /rosemary-beach/restaurants)
    for (const p of seoPages ?? []) {
      const full = p.slug as string;
      if (!full) continue;
      const i = full.indexOf("/");
      if (i <= 0 || i >= full.length - 1) continue;
      const townSlug = full.slice(0, i);
      if (isReservedRootSlug(townSlug)) continue;
      entries.push({
        url: `${base}/${full}`,
        lastModified: pickDate(p, now),
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }

    return dedupeByUrl(entries);
  } catch (err) {
    // Avoid hard 500s for crawlers — static URLs preserve discovery of hub pages until fixed.
    console.error("[sitemap] generation failed:", err);
    return staticUrlsOnly(base, now);
  }
}

/**
 * Use `businesses_view` + browse visibility filters so URLs match **`/business/[slug]`**, which rejects hidden rows (`notFound()`).
 */
async function fetchSitemapBusinessRows(supabase: SupabaseClient): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("businesses_view")
      .select("id, slug, date_updated, published_at, date_created, featured")
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .or(BROWSE_VISIBLE_NOT_HIDDEN)
      .order("id", { ascending: true })
      .range(from, from + SITEMAP_PAGE_SIZE - 1);
    if (error) {
      console.error("sitemap: businesses_view", error);
      break;
    }
    const batch = ((data ?? []) as unknown) as Record<string, unknown>[];
    out.push(...batch);
    if (batch.length < SITEMAP_PAGE_SIZE) break;
    from += SITEMAP_PAGE_SIZE;
  }
  return out;
}

function buildBusinessSitemapEntries(
  base: string,
  businesses: Record<string, unknown>[],
  now: Date,
): MetadataRoute.Sitemap {
  const slugUsed = new Set<string>();
  const out: MetadataRoute.Sitemap = [];

  for (const b of businesses) {
    const id = (b as { id?: string }).id;
    if (id == null) continue;

    const slugRaw = (b as { slug?: string | null }).slug;
    const slug = typeof slugRaw === "string" ? slugRaw.trim() : "";
    const isFeatured = Boolean((b as { featured?: boolean }).featured);

    let path: string;
    if (slug && !slugUsed.has(slug)) {
      slugUsed.add(slug);
      path = `business/${encodeURIComponent(slug)}`;
    } else {
      path = `business/${id}`;
    }

    const priority = isFeatured ? 0.8 : 0.7;

    out.push({
      url: `${base}/${path}`,
      lastModified: pickDate(b, now),
      changeFrequency: "monthly",
      priority,
    });
  }

  return out;
}

async function fetchSeoPageRows(supabase: SupabaseClient): Promise<Record<string, unknown>[]> {
  const candidates: Record<string, unknown>[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("seo_pages")
      .select("slug, date_updated, recommendation_set_id")
      .eq("published", true)
      .order("slug", { ascending: true })
      .range(from, from + SITEMAP_PAGE_SIZE - 1);
    if (error) {
      console.error("sitemap: seo_pages", error);
      break;
    }
    const batch = ((data ?? []) as unknown) as Record<string, unknown>[];
    candidates.push(...batch);
    if (batch.length < SITEMAP_PAGE_SIZE) break;
    from += SITEMAP_PAGE_SIZE;
  }

  /** Only list intent URLs that resolve (published row + non-empty `query_cache` recommendations). */
  const out: Record<string, unknown>[] = [];
  const CACHE_ID_CHUNK = 100;
  for (let i = 0; i < candidates.length; i += CACHE_ID_CHUNK) {
    const chunk = candidates.slice(i, i + CACHE_ID_CHUNK);
    const cacheIds = [
      ...new Set(
        chunk
          .map((row) => row.recommendation_set_id)
          .filter((id): id is string => id != null && String(id).trim() !== ""),
      ),
    ];
    if (cacheIds.length === 0) continue;

    const { data: caches, error: cacheErr } = await supabase
      .from("query_cache")
      .select("id, response_json")
      .in("id", cacheIds);
    if (cacheErr) {
      console.error("sitemap: query_cache for seo_pages", cacheErr);
      continue;
    }

    const renderableCacheIds = new Set<string>();
    for (const row of caches ?? []) {
      const id = String((row as { id: string }).id);
      const response = (row as { response_json?: unknown }).response_json;
      if (
        response &&
        typeof response === "object" &&
        Array.isArray((response as { recommendations?: unknown[] }).recommendations) &&
        (response as { recommendations: unknown[] }).recommendations.length > 0
      ) {
        renderableCacheIds.add(id);
      }
    }

    for (const row of chunk) {
      const cacheId = row.recommendation_set_id != null ? String(row.recommendation_set_id) : "";
      if (cacheId && renderableCacheIds.has(cacheId)) {
        out.push(row);
      }
    }
  }
  return out;
}

async function fetchBrowseableRows(
  supabase: SupabaseClient,
  table: string,
  select: string,
): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .or(BROWSE_VISIBLE_NOT_HIDDEN)
      .order("id", { ascending: true })
      .range(from, from + SITEMAP_PAGE_SIZE - 1);
    if (error) {
      console.error(`sitemap: ${table}`, error);
      break;
    }
    const batch = ((data ?? []) as unknown) as Record<string, unknown>[];
    out.push(...batch);
    if (batch.length < SITEMAP_PAGE_SIZE) break;
    from += SITEMAP_PAGE_SIZE;
  }
  return out;
}

function pickDate(row: Record<string, unknown>, fallback: Date): Date {
  for (const k of ["date_updated", "published_at", "starts_at", "date_created"]) {
    const v = row[k];
    if (typeof v === "string" && v) {
      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  return fallback;
}

function dedupeByUrl(entries: MetadataRoute.Sitemap): MetadataRoute.Sitemap {
  const seen = new Set<string>();
  const out: MetadataRoute.Sitemap = [];
  for (const e of entries) {
    if (seen.has(e.url)) continue;
    seen.add(e.url);
    out.push(e);
  }
  return out;
}
