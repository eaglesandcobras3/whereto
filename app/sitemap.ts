import type { MetadataRoute } from "next";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";
import { getSiteUrl } from "@/lib/site-url";
import { isReservedRootSlug } from "@/lib/routes/reserved-slugs";
import { PRIMARY_REGION_DB_SLUG, PRIMARY_REGION_HUB_PATH } from "@/lib/routes/primary-region";
import { BROWSE_VISIBLE_NOT_HIDDEN } from "@/lib/shop/public-listing-filters";

/** PostgREST often caps a single response at ~1000 rows; paginate to include full catalogs. */
const SITEMAP_PAGE_SIZE = 1000;

const STATIC_PATHS = [
  "/",
  "/about",
  "/terms",
  "/privacy",
  "/guide",
  "/towns",
  "/search",
  "/login",
] as const;

/**
 * Sitemap from Supabase: towns, businesses, guides, events, areas, and points of interest.
 * Businesses: every non-archived row, `/business/{slug}` when slug is set and unique, else
 * `/business/{id}` (matches the app’s UUID route).
 * `lastModified` prefers `date_updated`, then `published_at` / event `starts_at`, then `date_created`.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();
  const supabase = getServiceSupabaseOrNull();
  if (!supabase) {
    return [
      { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
      ...STATIC_PATHS.filter((p) => p !== "/").map(
        (p) =>
          ({
            url: `${base}${p}`,
            lastModified: now,
            changeFrequency: "monthly" as const,
            priority: 0.4,
          }) satisfies MetadataRoute.Sitemap[0],
      ),
    ];
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

  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/guide`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: `${base}${PRIMARY_REGION_HUB_PATH}`, lastModified: now, changeFrequency: "weekly", priority: 0.88 },
  ];

  for (const p of STATIC_PATHS) {
    if (p === "/") continue;
    entries.push({
      url: `${base}${p}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    });
  }

  for (const t of towns ?? []) {
    const slug = t.slug as string;
    if (!slug || isReservedRootSlug(slug) || slug === PRIMARY_REGION_DB_SLUG) continue;
    const lm = pickDate(t, now);
    entries.push({ url: `${base}/${slug}`, lastModified: lm, changeFrequency: "weekly", priority: 0.9 });
  }

  // Single region: hub is only PRIMARY_REGION_HUB_PATH (`/towns`); no extra /{regionSlug} URLs.

  entries.push(
    ...buildBusinessSitemapEntries(base, businesses ?? [], now),
  );

  for (const g of guides ?? []) {
    const slug = g.slug as string;
    if (!slug) continue;
    entries.push({
      url: `${base}/guide/${slug}`,
      lastModified: pickDate(g, now),
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  for (const e of events ?? []) {
    const slug = e.slug as string;
    if (!slug) continue;
    entries.push({
      url: `${base}/events/${slug}`,
      lastModified: pickDate(e, now),
      changeFrequency: "weekly",
      priority: 0.62,
    });
  }

  for (const a of areas ?? []) {
    const slug = a.slug as string;
    if (!slug) continue;
    entries.push({
      url: `${base}/area/${slug}`,
      lastModified: pickDate(a, now),
      changeFrequency: "monthly",
      priority: 0.58,
    });
  }

  for (const p of pointsOfInterest ?? []) {
    const slug = p.slug as string;
    if (!slug) continue;
    entries.push({
      url: `${base}/area/${slug}`,
      lastModified: pickDate(p, now),
      changeFrequency: "monthly",
      priority: 0.58,
    });
  }

  return dedupeByUrl(entries);
}

/**
 * All **non-archived** businesses (not limited to “browse visible”): sitemaps should list
 * every public detail URL. Rows missing `slug` still resolve via `/business/{id}` in the app.
 */
async function fetchSitemapBusinessRows(supabase: SupabaseClient): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("businesses")
      .select("id, slug, date_updated, published_at, date_created")
      .is("archived_at", null)
      .order("id", { ascending: true })
      .range(from, from + SITEMAP_PAGE_SIZE - 1);
    if (error) {
      // eslint-disable-next-line no-console
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
    let path: string;
    if (slug && !slugUsed.has(slug)) {
      slugUsed.add(slug);
      path = `business/${encodeURIComponent(slug)}`;
    } else {
      // No slug, empty slug, or duplicate slug: canonical detail route is `/business/{uuid}`.
      path = `business/${id}`;
    }
    out.push({
      url: `${base}/${path}`,
      lastModified: pickDate(b, now),
      changeFrequency: "monthly",
      priority: 0.65,
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
      .or(BROWSE_VISIBLE_NOT_HIDDEN)
      .order("id", { ascending: true })
      .range(from, from + SITEMAP_PAGE_SIZE - 1);
    if (error) {
      // eslint-disable-next-line no-console
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
