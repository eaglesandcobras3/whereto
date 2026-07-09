import "server-only";

import type { MetadataRoute } from "next";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";
import { getSiteUrl } from "@/lib/site-url";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import {
  businessSitemapPath,
  isBusinessIndexReady,
  type BusinessIndexReadinessFields,
} from "@/lib/seo/business-index-readiness";
import {
  pickSitemapDate,
  SITEMAP_BUSINESS_ENTRY,
  type SitemapRow,
} from "@/lib/seo/sitemap-strategy";

const SITEMAP_PAGE_SIZE = 1000;

type BusinessSitemapRow = BusinessIndexReadinessFields &
  SitemapRow & {
    slug: string | null;
  };

async function fetchPublishedBusinessRows(
  supabase: SupabaseClient,
): Promise<BusinessSitemapRow[]> {
  const out: BusinessSitemapRow[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("businesses_view")
      .select(
        "slug, excerpt, content, address, hero_image, main_image, hero_image_url, main_image_url, primary_category_id, town_id, is_hidden_from_search, date_updated, published_at, date_created",
      )
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .or(BROWSE_VISIBLE_NOT_HIDDEN)
      .order("id", { ascending: true })
      .range(from, from + SITEMAP_PAGE_SIZE - 1);
    if (error) {
      console.error("sitemap: businesses_view", error);
      break;
    }
    const batch = ((data ?? []) as unknown) as BusinessSitemapRow[];
    out.push(...batch);
    if (batch.length < SITEMAP_PAGE_SIZE) break;
    from += SITEMAP_PAGE_SIZE;
  }
  return out;
}

export function buildBusinessSitemapEntries(input: {
  base: string;
  now: Date;
  businesses: BusinessSitemapRow[];
}): MetadataRoute.Sitemap {
  const { base, now, businesses } = input;
  const entries: MetadataRoute.Sitemap = [];

  for (const row of businesses) {
    if (!isBusinessIndexReady(row)) continue;
    const slug = String(row.slug ?? "").trim();
    entries.push({
      url: `${base}${businessSitemapPath(slug)}`,
      lastModified: pickSitemapDate(row, now),
      changeFrequency: SITEMAP_BUSINESS_ENTRY.changeFreq,
      priority: SITEMAP_BUSINESS_ENTRY.priority,
    });
  }

  return entries;
}

/** Index-ready business listing URLs for `/sitemap-businesses.xml`. */
export async function fetchBusinessSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();
  try {
    const supabase = getServiceSupabaseOrNull();
    if (!supabase) return [];

    const businesses = await fetchPublishedBusinessRows(supabase);
    return buildBusinessSitemapEntries({ base, now, businesses });
  } catch (err) {
    console.error("[sitemap-businesses] generation failed:", err);
    return [];
  }
}
