import type { MetadataRoute } from "next";
import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";
import { getSiteUrl } from "@/lib/site-url";
import { isReservedRootSlug } from "@/lib/routes/reserved-slugs";
import {
  PRIMARY_REGION_DB_SLUG,
  PRIMARY_REGION_HUB_PATH,
} from "@/lib/routes/primary-region";
import { BROWSE_VISIBLE_NOT_HIDDEN } from "@/lib/shop/public-listing-filters";

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
 * Sitemap from Supabase: towns, regions, businesses, guides, events, and areas
 * (Directus-backed collections). `lastModified` uses row timestamps when available.
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
    { data: towns },
    { data: regions },
    { data: businesses },
    { data: guides },
    { data: events },
  ] = await Promise.all([
    supabase
      .from("towns")
      .select("slug, date_updated, published_at")
      .is("archived_at", null)
      .or(BROWSE_VISIBLE_NOT_HIDDEN),
    supabase
      .from("regions")
      .select("slug, date_updated, published_at"),
    supabase
      .from("businesses")
      .select("slug, date_updated, published_at")
      .is("archived_at", null)
      .or(BROWSE_VISIBLE_NOT_HIDDEN)
      .limit(8000),
    supabase
      .from("guides")
      .select("slug, date_updated, published_at")
      .is("archived_at", null)
      .or(BROWSE_VISIBLE_NOT_HIDDEN),
    supabase
      .from("events")
      .select("slug, date_updated, published_at, starts_at")
      .is("archived_at", null)
      .or(BROWSE_VISIBLE_NOT_HIDDEN),
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
    if (!slug || isReservedRootSlug(slug)) continue;
    const lm = pickDate(t, now);
    entries.push({ url: `${base}/${slug}`, lastModified: lm, changeFrequency: "weekly", priority: 0.9 });
  }

  for (const r of regions ?? []) {
    const slug = r.slug as string;
    if (!slug || isReservedRootSlug(slug) || slug === PRIMARY_REGION_DB_SLUG) continue;
    entries.push({
      url: `${base}/${slug}`,
      lastModified: pickDate(r, now),
      changeFrequency: "weekly",
      priority: 0.86,
    });
  }

  for (const b of businesses ?? []) {
    const slug = b.slug as string;
    if (!slug) continue;
    entries.push({
      url: `${base}/business/${slug}`,
      lastModified: pickDate(b, now),
      changeFrequency: "monthly",
      priority: 0.65,
    });
  }

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

  return dedupeByUrl(entries);
}

function pickDate(row: Record<string, unknown>, fallback: Date): Date {
  for (const k of ["date_updated", "published_at", "starts_at"]) {
    const v = row[k];
    if (typeof v === "string" && v) return new Date(v);
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
