import type { SupabaseClient } from "@supabase/supabase-js";
import { categoryHubPath } from "@/lib/routes/category-hub-path";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
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

  const [listing_count, town_coverage_count] = await Promise.all([
    countCategoryListings(supabase, row.id),
    countTownCoverage(supabase, row.id),
  ]);

  const public_path = categoryHubPath(row.slug);
  const excerptLen = row.excerpt?.trim().length ?? 0;

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
    // Seeded/generated editorial is gated by PostHog `category_hub_seo`; only DB excerpt counts here.
    has_editorial_block: excerptLen >= 80,
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
