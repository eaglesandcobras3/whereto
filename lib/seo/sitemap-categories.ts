import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { businessBrowseGroupFromPublicSegment } from "@/lib/business-categories/browse-group-nav";
import { businessCategoryGroupForSlug } from "@/lib/business-categories/groups";
import {
  browseSectionForCategorySlug,
  unifiedRollupFromPublicSegment,
} from "@/lib/categories/unified-browse";
import { DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { isCategoryEligibleForSitemap } from "@/lib/seo/sitemap-category-eligibility";
import { listSitemapBrowseGroupPaths } from "@/lib/seo/sitemap-strategy";

const PAGE_SIZE = 1000;

/**
 * Published leaf category hubs with enough listings for the hub sitemap.
 * Parents and empty/sparse leaves are omitted.
 */
export async function fetchSitemapCategories(
  supabase: SupabaseClient,
): Promise<Record<string, unknown>[]> {
  const categories: Record<string, unknown>[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("business_categories")
      .select("id, slug, parent_category_id, date_updated, published_at, date_created")
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .not("status", "eq", "archived")
      .not("status", "eq", "draft")
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error("sitemap: business_categories", error);
      break;
    }
    const batch = (data ?? []) as Record<string, unknown>[];
    categories.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  const listingCounts = new Map<string, number>();
  from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("businesses_view")
      .select("primary_category_id")
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .not("primary_category_id", "is", null)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error("sitemap: category listing counts", error);
      break;
    }
    const batch = (data ?? []) as { primary_category_id?: string | null }[];
    for (const row of batch) {
      const id = row.primary_category_id;
      if (!id) continue;
      listingCounts.set(id, (listingCounts.get(id) ?? 0) + 1);
    }
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  const eligible: Record<string, unknown>[] = [];
  for (const cat of categories) {
    const id = String(cat.id ?? "");
    const listing_count = listingCounts.get(id) ?? 0;
    const row = { ...cat, listing_count };
    if (!isCategoryEligibleForSitemap(row)) continue;
    eligible.push({
      slug: cat.slug,
      date_updated: cat.date_updated,
      published_at: cat.published_at,
      date_created: cat.date_created,
      listing_count,
    });
  }
  return eligible;
}

async function listCategorySlugsWithListings(supabase: SupabaseClient): Promise<Set<string>> {
  const idToSlug = new Map<string, string>();
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("business_categories")
      .select("id, slug")
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error("sitemap: category slug map", error);
      break;
    }
    const batch = (data ?? []) as { id?: string; slug?: string }[];
    for (const row of batch) {
      if (row.id && row.slug) idToSlug.set(String(row.id), String(row.slug));
    }
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  const slugs = new Set<string>();
  from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("businesses_view")
      .select("primary_category_id")
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .not("primary_category_id", "is", null)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error("sitemap: browse-group listing scan", error);
      break;
    }
    const batch = (data ?? []) as { primary_category_id?: string | null }[];
    for (const row of batch) {
      const slug = row.primary_category_id ? idToSlug.get(String(row.primary_category_id)) : null;
      if (slug) slugs.add(slug);
    }
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return slugs;
}

function browseGroupTargetFromPath(path: string): string | null {
  const segment = path.replace(/^\/businesses\//, "").trim();
  if (!segment) return null;
  return (
    unifiedRollupFromPublicSegment(segment) ??
    businessBrowseGroupFromPublicSegment(segment) ??
    null
  );
}

function categoryMatchesBrowseGroup(categorySlug: string, groupSlug: string): boolean {
  const section = browseSectionForCategorySlug(categorySlug);
  if (section?.id === groupSlug) return true;
  return businessCategoryGroupForSlug(categorySlug) === groupSlug;
}

/** Browse rollup paths that currently have at least one matching published listing. */
export async function listNonEmptySitemapBrowseGroupPaths(
  supabase: SupabaseClient,
): Promise<string[]> {
  const slugsWithListings = await listCategorySlugsWithListings(supabase);
  const out: string[] = [];
  for (const path of listSitemapBrowseGroupPaths()) {
    const target = browseGroupTargetFromPath(path);
    if (!target) continue;
    let has = false;
    for (const slug of slugsWithListings) {
      if (categoryMatchesBrowseGroup(slug, target)) {
        has = true;
        break;
      }
    }
    if (has) out.push(path);
  }
  return out;
}
