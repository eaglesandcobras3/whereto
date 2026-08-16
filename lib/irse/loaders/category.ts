import type { SupabaseClient } from "@supabase/supabase-js";
import { categoryHubPath } from "@/lib/routes/category-hub-path";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import {
  categoryHubHasEditorialBlock,
  type CategoryHubInventory,
} from "@/lib/seo/category-hub-substance";
import type { CategoryIrseInput } from "../inputs";

/** Categories with dedicated audit-tuned metadata in hub-metadata. */
const AUDIT_META_SLUGS = new Set([
  "restaurants",
  "shopping",
  "coffee_shops",
  "bars",
  "activities",
]);

export async function loadCategoryIrseInput(
  supabase: SupabaseClient,
  slug: string,
): Promise<CategoryIrseInput | null> {
  const key = slug.trim().replace(/-/g, "_");
  // Accept public segment or DB slug
  const candidates = Array.from(
    new Set([slug.trim(), key, slug.trim().replace(/_/g, "-")]),
  );

  type CategoryRow = {
    id: string;
    slug: string;
    title: string | null;
    excerpt: string | null;
    status: string | null;
  };

  let row: CategoryRow | null = null;

  for (const candidate of candidates) {
    const { data } = await supabase
      .from("business_categories")
      .select("id, slug, title, excerpt, status")
      .eq("slug", candidate)
      .is("archived_at", null)
      .maybeSingle();
    if (data) {
      row = data as CategoryRow;
      break;
    }
  }

  if (!row) return null;

  const [listing_count, town_coverage_count, townNames] = await Promise.all([
    countCategoryListings(supabase, row.id),
    countTownCoverage(supabase, row.id),
    listTownNamesForCategory(supabase, row.id),
  ]);

  const public_path = categoryHubPath(row.slug);
  const inventory: CategoryHubInventory = {
    title: row.title?.trim() || row.slug,
    slug: row.slug,
    excerpt: row.excerpt,
    listingCount: listing_count,
    townNames,
    regionalCount: 0,
  };

  return {
    kind: "category",
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    status: row.status,
    public_path,
    has_audit_metadata: AUDIT_META_SLUGS.has(row.slug),
    listing_count,
    town_coverage_count,
    has_editorial_block: categoryHubHasEditorialBlock(inventory),
  };
}

async function countCategoryListings(supabase: SupabaseClient, categoryId: string): Promise<number> {
  const { count } = await supabase
    .from("businesses_view")
    .select("id", { count: "exact", head: true })
    .eq("primary_category_id", categoryId)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .is("archived_at", null);
  return count ?? 0;
}

async function countTownCoverage(supabase: SupabaseClient, categoryId: string): Promise<number> {
  const { data } = await supabase
    .from("businesses_view")
    .select("town_id")
    .eq("primary_category_id", categoryId)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .is("archived_at", null)
    .not("town_id", "is", null)
    .limit(500);
  const towns = new Set(
    (data ?? [])
      .map((r) => (r as { town_id: string | number | null }).town_id)
      .filter((id): id is string | number => id != null),
  );
  return towns.size;
}

async function listTownNamesForCategory(
  supabase: SupabaseClient,
  categoryId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("businesses_view")
    .select("towns ( title )")
    .eq("primary_category_id", categoryId)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .is("archived_at", null)
    .limit(500);
  const names = new Set<string>();
  for (const row of data ?? []) {
    const town = (row as { towns?: { title?: string } | null }).towns;
    const title = town?.title?.trim();
    if (title) names.add(title);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}
