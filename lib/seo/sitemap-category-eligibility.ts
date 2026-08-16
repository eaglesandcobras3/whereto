import { CATEGORY_HUB_MIN_LISTINGS_FOR_INDEX } from "@/lib/seo/category-hub-constants";

export type SitemapCategoryRow = {
  slug?: unknown;
  parent_category_id?: unknown;
  listing_count?: unknown;
  date_updated?: unknown;
  published_at?: unknown;
  date_created?: unknown;
};

/**
 * Leaf category hubs with enough published inventory to justify indexing.
 * Parents (null parent_category_id) are excluded — listings attach to leaves via primary_category_id.
 */
export function isCategoryEligibleForSitemap(row: SitemapCategoryRow): boolean {
  const slug = String(row.slug ?? "").trim();
  if (!slug) return false;
  if (row.parent_category_id == null || row.parent_category_id === "") return false;
  const count = Number(row.listing_count ?? 0);
  if (!Number.isFinite(count) || count < CATEGORY_HUB_MIN_LISTINGS_FOR_INDEX) return false;
  return true;
}
