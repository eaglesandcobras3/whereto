import type { MetadataRoute } from "next";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";
import { getSiteUrl } from "@/lib/site-url";
import { isReservedRootSlug } from "@/lib/routes/reserved-slugs";
import { PRIMARY_REGION_DB_SLUG, PRIMARY_REGION_HUB_PATH } from "@/lib/routes/primary-region";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";

/** PostgREST often caps a single response at ~1000 rows; paginate to include full catalogs. */
const SITEMAP_PAGE_SIZE = 1000;

const STATIC_PAGES = [
  { path: "/", priority: 1.0, changeFreq: "daily" as const },
  { path: "/guide", priority: 0.95, changeFreq: "weekly" as const },
  { path: PRIMARY_REGION_HUB_PATH, priority: 0.9, changeFreq: "weekly" as const },
  { path: "/about", priority: 0.5, changeFreq: "monthly" as const },
  { path: "/list-your-business", priority: 0.45, changeFreq: "monthly" as const },
  { path: "/terms", priority: 0.3, changeFreq: "yearly" as const },
  { path: "/privacy", priority: 0.3, changeFreq: "yearly" as const },
] as const;

/**
 * Comprehensive sitemap optimized for SEO:
 * - Static pages with appropriate priorities
 * - Towns (high priority - main navigation hubs)
 * - Businesses (medium-high priority - core content)
 * - Guides (medium priority - editorial content)
 * - Events (medium priority - time-sensitive content)
 * - Areas & POIs (medium priority - location content)
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();
  const supabase = getServiceSupabaseOrNull();

  if (!supabase) {
    return STATIC_PAGES.map((p) => ({
      url: `${base}${p.path}`,
      lastModified: now,
      changeFrequency: p.changeFreq,
      priority: p.priority,
    }));
  }

  const [
    towns,
    businesses,
    guides,
    events,
    areas,
    pointsOfInterest,
  ] = await Promise.all([
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
  ]);

  const entries: MetadataRoute.Sitemap = [];

  // Static pages first
  for (const p of STATIC_PAGES) {
    entries.push({
      url: `${base}${p.path}`,
      lastModified: now,
      changeFrequency: p.changeFreq,
      priority: p.priority,
    });
  }

  // Towns - high priority hub pages
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

  // Businesses - core content with varying priorities
  entries.push(...buildBusinessSitemapEntries(base, businesses ?? [], now));

  // Guides - editorial content
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

  // Events - time-sensitive content
  for (const e of events ?? []) {
    const slug = e.slug as string;
    if (!slug) continue;
    const eventDate = pickDate(e, now);
    // Boost priority for upcoming events
    const isUpcoming = eventDate > now;
    entries.push({
      url: `${base}/events/${slug}`,
      lastModified: eventDate,
      changeFrequency: "weekly",
      priority: isUpcoming ? 0.7 : 0.5,
    });
  }

  // Areas - location content
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

  // Points of Interest
  for (const p of pointsOfInterest ?? []) {
    const slug = p.slug as string;
    if (!slug) continue;
    entries.push({
      url: `${base}/area/${slug}`,
      lastModified: pickDate(p, now),
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  return dedupeByUrl(entries);
}

/**
 * All **non-archived** businesses: sitemaps should list every public detail URL.
 */
async function fetchSitemapBusinessRows(supabase: SupabaseClient): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("businesses")
      .select("id, slug, date_updated, published_at, date_created, featured")
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .order("id", { ascending: true })
      .range(from, from + SITEMAP_PAGE_SIZE - 1);
    if (error) {
      console.error("sitemap: businesses", error);
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

    // Featured businesses get higher priority
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
