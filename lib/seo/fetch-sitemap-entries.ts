import "server-only";

import type { MetadataRoute } from "next";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";
import { getSiteUrl } from "@/lib/site-url";
import { DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { buildSitemapEntries, staticFallbackSitemap } from "@/lib/seo/sitemap-strategy";
import {
  fetchSitemapCategories,
  listNonEmptySitemapBrowseGroupPaths,
} from "@/lib/seo/sitemap-categories";
import { fetchSitemapGuides } from "@/lib/seo/sitemap-guides";
import { fetchSitemapRentals } from "@/lib/seo/sitemap-rentals";
import { fetchSitemapBusinesses } from "@/lib/seo/fetch-sitemap-businesses";
import { fetchSitemapAreaIntentRows } from "@/lib/seo/fetch-sitemap-area-intents";
import { getAllFeatureFlags, isRentalsFeatureEnabled } from "@/lib/feature-flags";
import { fetchEligibleTownIntentRows } from "@/lib/seo/town-intent-pages";

const SITEMAP_PAGE_SIZE = 1000;

async function fetchPublishedRows(
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

    const flags = await getAllFeatureFlags();
    const includeRentals = isRentalsFeatureEnabled(flags);

    const [
      towns,
      guides,
      areas,
      pointsOfInterest,
      categories,
      browseGroupPaths,
      events,
      rentalBundle,
      businesses,
      townIntents,
      areaIntents,
    ] =
      await Promise.all([
        fetchPublishedRows(supabase, "towns", "slug, date_updated, published_at, date_created"),
        fetchSitemapGuides(supabase),
        fetchPublishedRows(supabase, "areas", "slug, date_updated, published_at, date_created"),
        fetchPublishedRows(
          supabase,
          "points_of_interest",
          "slug, date_updated, published_at, date_created",
        ),
        fetchSitemapCategories(supabase),
        listNonEmptySitemapBrowseGroupPaths(supabase),
        fetchPublishedRows(supabase, "events", "slug, date_updated, published_at, date_created"),
        includeRentals
          ? fetchSitemapRentals(supabase)
          : Promise.resolve({
              rentals: [] as Record<string, unknown>[],
              rentalTownHubs: [] as Record<string, unknown>[],
            }),
        fetchSitemapBusinesses(supabase),
        fetchEligibleTownIntentRows(supabase).then((rows) =>
          rows.map((row) => ({
            town_slug: row.townSlug,
            seo_slug: row.seoSlug,
            expires_at: row.lastModified,
          })),
        ),
        fetchSitemapAreaIntentRows(supabase),
      ]);

    return buildSitemapEntries({
      base,
      now,
      towns,
      guides,
      areas,
      categories,
      browseGroupPaths,
      pointsOfInterest,
      events,
      includeRentals,
      rentals: rentalBundle.rentals,
      rentalTownHubs: rentalBundle.rentalTownHubs,
      businesses,
      townIntents,
      areaIntents,
    });
  } catch (err) {
    console.error("[sitemap] generation failed:", err);
    return staticFallbackSitemap(base, now);
  }
}
