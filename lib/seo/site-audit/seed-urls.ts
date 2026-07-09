import type { SupabaseClient } from "@supabase/supabase-js";
import { businessBrowseGroupHubPath } from "@/lib/business-categories/browse-group-nav";
import { BUSINESS_CATEGORY_GROUP_SLUGS } from "@/lib/business-categories/groups";
import { serviceBrowseGroupHubPath } from "@/lib/service-categories/browse-group-nav";
import { SERVICE_CATEGORY_GROUP_SLUGS } from "@/lib/service-categories/groups";
import { collectSitemapPageUrls } from "@/lib/seo/validate-sitemap-urls";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { normalizeAuditUrl } from "./page-kind";

const SEED_PAGE_SIZE = 1000;

export async function collectSeedUrls(input: {
  baseUrl: string;
  fetchFn?: typeof fetch;
  supabase?: SupabaseClient | null;
  includeBusinessUrls?: boolean;
}): Promise<{ seedUrls: string[]; sitemapUrls: string[] }> {
  const base = input.baseUrl.replace(/\/$/, "");
  const fetchFn = input.fetchFn ?? fetch;

  let sitemapUrls: string[] = [];
  try {
    sitemapUrls = await collectSitemapPageUrls(`${base}/sitemap.xml`, fetchFn);
  } catch {
  }

  if (sitemapUrls.length === 0) {
    console.warn("[seo-audit] sitemap.xml unavailable; using DB/static seeds only");
  }

  const seeds = new Set<string>(sitemapUrls.map(normalizeAuditUrl));

  seeds.add(normalizeAuditUrl(base));
  seeds.add(normalizeAuditUrl(`${base}/businesses`));

  for (const slug of BUSINESS_CATEGORY_GROUP_SLUGS) {
    seeds.add(normalizeAuditUrl(`${base}${businessBrowseGroupHubPath(slug)}`));
  }
  for (const slug of SERVICE_CATEGORY_GROUP_SLUGS) {
    seeds.add(normalizeAuditUrl(`${base}${serviceBrowseGroupHubPath(slug)}`));
  }

  const supabase = input.supabase;
  if (supabase) {
    if (input.includeBusinessUrls !== false) {
      let from = 0;
      for (;;) {
        const { data, error } = await supabase
          .from("businesses_view")
          .select("slug")
          .is("archived_at", null)
          .eq("status", DIRECTUS_PUBLISHED_STATUS)
          .or(BROWSE_VISIBLE_NOT_HIDDEN)
          .order("id", { ascending: true })
          .range(from, from + SEED_PAGE_SIZE - 1);
        if (error) break;
        const batch = data ?? [];
        for (const row of batch) {
          const slug = String((row as { slug: string }).slug ?? "").trim();
          if (slug) seeds.add(normalizeAuditUrl(`${base}/business/${encodeURIComponent(slug)}`));
        }
        if (batch.length < SEED_PAGE_SIZE) break;
        from += SEED_PAGE_SIZE;
      }
    }

    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("events")
        .select("slug")
        .is("archived_at", null)
        .eq("status", DIRECTUS_PUBLISHED_STATUS)
        .or(BROWSE_VISIBLE_NOT_HIDDEN)
        .order("id", { ascending: true })
        .range(from, from + SEED_PAGE_SIZE - 1);
      if (error) break;
      const batch = data ?? [];
      for (const row of batch) {
        const slug = String((row as { slug: string }).slug ?? "").trim();
        if (slug) seeds.add(normalizeAuditUrl(`${base}/events/${encodeURIComponent(slug)}`));
      }
      if (batch.length < SEED_PAGE_SIZE) break;
      from += SEED_PAGE_SIZE;
    }
  }

  return {
    seedUrls: [...seeds].sort(),
    sitemapUrls: sitemapUrls.map(normalizeAuditUrl),
  };
}
