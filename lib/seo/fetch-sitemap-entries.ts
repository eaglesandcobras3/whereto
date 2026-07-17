import "server-only";

import type { MetadataRoute } from "next";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";
import { getSiteUrl } from "@/lib/site-url";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { buildSitemapEntries, staticFallbackSitemap } from "@/lib/seo/sitemap-strategy";
import { fetchSitemapGuides } from "@/lib/seo/sitemap-guides";

const SITEMAP_PAGE_SIZE = 1000;

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
      .not("status", "eq", "archived")
      .not("status", "eq", "draft")
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

/** Build hub/editorial sitemap entries for `/sitemap.xml`. */
export async function fetchSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();
  try {
    const supabase = getServiceSupabaseOrNull();
    if (!supabase) {
      return staticFallbackSitemap(base, now);
    }

    const [towns, guides, areas, pointsOfInterest, categories, events] = await Promise.all([
      fetchBrowseableRows(supabase, "towns", "slug, date_updated, published_at, date_created"),
      fetchSitemapGuides(supabase),
      fetchBrowseableRows(supabase, "areas", "slug, date_updated, published_at, date_created"),
      fetchBrowseableRows(
        supabase,
        "points_of_interest",
        "slug, date_updated, published_at, date_created",
      ),
      fetchBrowseableRows(
        supabase,
        "business_categories",
        "slug, date_updated, published_at, date_created",
      ),
      fetchBrowseableRows(supabase, "events", "slug, date_updated, published_at, date_created"),
    ]);

    return buildSitemapEntries({
      base,
      now,
      towns,
      guides,
      areas,
      categories,
      pointsOfInterest,
      events,
    });
  } catch (err) {
    console.error("[sitemap] generation failed:", err);
    return staticFallbackSitemap(base, now);
  }
}
