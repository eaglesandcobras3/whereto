import "server-only";

import type { Metadata } from "next";
import { getServiceSupabase, getServiceSupabaseOrNull } from "@/lib/supabase/service-role";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import { categoryHubMetadataFromAudit } from "@/lib/seo/hub-metadata";
import { categoryHubPath } from "@/lib/routes/category-hub-path";
import { displayStorefrontCategoryTitle } from "@/lib/routes/storefront-category-labels";
import {
  categoryDbSlugCandidatesFromPublicPath,
} from "@/lib/routes/category-hub-path";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { getPublicImageUrlWithView } from "@/lib/media/public-image-url";
import { sortBrowseBusinesses } from "@/lib/data/place-category-shared";
import {
  groupBusinessesIntoBrowseSections,
  type BrowseGroupSection,
} from "@/lib/business-categories/group-browse-sections";

const CATEGORY_HUB_BUSINESS_POOL_LIMIT = 2000;

/** Batch load for `/categories` hub — storefront listings with category slug for grouping. */
const CATEGORY_HUB_BUSINESS_SELECT =
  "id, slug, title, excerpt, primary_category_id, main_image, hero_image, main_image_url, hero_image_url, business_categories ( slug )";

export type CategoryRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
};

export type CategoryBusinessRow = {
  id: string;
  slug: string;
  name: string;
  excerpt: string | null;
  hero_image_url: string | null;
  featured: boolean;
  price_level: number | null;
  town_id: string | null;
  town_name: string | null;
  town_slug: string | null;
};

export type CategoryTownGroup = {
  name: string;
  slug: string;
  townId: string | null;
  businesses: CategoryBusinessRow[];
  totalCount: number;
};

export type CategoryHubBusinessPreview = {
  id: string;
  slug: string;
  name: string;
  hero_image_url: string | null;
  ai_one_liner: string | null;
  ai_summary: string | null;
};

export type CategoryHubSection = BrowseGroupSection;

export async function listPublishedCategorySlugs(): Promise<string[]> {
  try {
    const supabase = getServiceSupabaseOrNull();
    if (!supabase) return [];
    const { data } = await supabase
      .from("business_categories")
      .select("slug")
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .or(BROWSE_VISIBLE_NOT_HIDDEN);
    return (data ?? [])
      .map((r) => String((r as { slug: string }).slug))
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function loadCategory(slug: string): Promise<CategoryRow | null> {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("business_categories")
    .select("id, title, slug, excerpt")
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  const r = data as { id: string; title: string; slug: string; excerpt: string | null };
  return { ...r, title: displayStorefrontCategoryTitle(r.slug, r.title) };
}

/** Resolve a public URL segment to a published category slug, or null. */
export async function resolveCategorySlugFromPublicPath(
  segment: string,
): Promise<string | null> {
  for (const candidate of categoryDbSlugCandidatesFromPublicPath(segment)) {
    const cat = await loadCategory(candidate);
    if (cat) return cat.slug;
  }
  return null;
}

export async function loadBusinessesForCategory(
  categoryId: string,
): Promise<CategoryBusinessRow[]> {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("businesses_view")
    .select(
      "id, slug, title, excerpt, main_image, hero_image, main_image_url, hero_image_url, featured, price_level, towns ( id, title, slug )",
    )
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .eq("is_storefront", true)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .eq("primary_category_id", categoryId)
    .order("featured", { ascending: false })
    .order("title", { ascending: true })
    .limit(500);

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const town = r.towns as { id?: string; title?: string; slug?: string } | null;
    const heroUrl = getPublicImageUrlWithView(
      r.main_image_url as string | null,
      r.hero_image_url as string | null,
      r.main_image as string | null,
      r.hero_image as string | null,
    );
    return {
      id: String(r.id),
      slug: String(r.slug),
      name: String((r as { title: string }).title),
      excerpt: (r.excerpt as string | null) ?? null,
      hero_image_url: heroUrl,
      featured: Boolean(r.featured),
      price_level: (r.price_level as number | null) ?? null,
      town_id: town?.id ?? null,
      town_name: town?.title ?? null,
      town_slug: town?.slug ?? null,
    };
  });
}

export function groupCategoryBusinessesByTown(
  businesses: CategoryBusinessRow[],
): CategoryTownGroup[] {
  const map = new Map<
    string,
    { name: string; slug: string; townId: string | null; pool: CategoryBusinessRow[] }
  >();
  const noTown: CategoryBusinessRow[] = [];

  for (const b of businesses) {
    if (!b.town_slug || !b.town_name) {
      noTown.push(b);
      continue;
    }
    if (!map.has(b.town_slug)) {
      map.set(b.town_slug, {
        name: b.town_name,
        slug: b.town_slug,
        townId: b.town_id,
        pool: [],
      });
    }
    map.get(b.town_slug)!.pool.push(b);
  }

  const groups: CategoryTownGroup[] = [...map.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((g) => {
      const sorted = sortBrowseBusinesses(g.pool);
      return {
        name: g.name,
        slug: g.slug,
        townId: g.townId,
        businesses: sorted,
        totalCount: sorted.length,
      };
    });

  if (noTown.length > 0) {
    const sorted = sortBrowseBusinesses(noTown);
    groups.push({
      name: "Other",
      slug: "",
      townId: null,
      businesses: sorted,
      totalCount: sorted.length,
    });
  }
  return groups;
}

function mapCategoryHubBusinessRow(row: Record<string, unknown>) {
  const heroUrl = getPublicImageUrlWithView(
    row.main_image_url as string | null,
    row.hero_image_url as string | null,
    row.main_image as string | null,
    row.hero_image as string | null,
  );
  const excerpt = (row.excerpt as string | null) ?? null;
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String((row as { title: string }).title),
    hero_image_url: heroUrl,
    ai_one_liner: excerpt,
    ai_summary: excerpt,
  };
}

export async function countCategoryHubBusinesses(): Promise<number> {
  const { count, error } = await getServiceSupabase()
    .from("businesses_view")
    .select("id", { count: "exact", head: true })
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .eq("is_storefront", true)
    .or(BROWSE_VISIBLE_NOT_HIDDEN);

  if (error) {
    console.error("categories hub: count query", error);
    return 0;
  }
  return count ?? 0;
}

export async function getCategoryHubSections(): Promise<CategoryHubSection[]> {
  const supabase = getServiceSupabase();

  const { data: businessRows, error: bizErr } = await supabase
    .from("businesses_view")
    .select(CATEGORY_HUB_BUSINESS_SELECT)
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .eq("is_storefront", true)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .order("featured", { ascending: false })
    .order("title", { ascending: true })
    .limit(CATEGORY_HUB_BUSINESS_POOL_LIMIT);

  if (bizErr) {
    console.error("categories hub: businesses query", bizErr);
    return [];
  }

  const pool = (businessRows ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const cat = r.business_categories as { slug?: string } | null;
    return {
      ...mapCategoryHubBusinessRow(r),
      categorySlug: cat?.slug ?? null,
    };
  });

  return groupBusinessesIntoBrowseSections(pool);
}

export async function loadCategoryHubPage(slug: string) {
  const cat = await loadCategory(slug);
  if (!cat) return null;

  const businesses = await loadBusinessesForCategory(cat.id);

  return {
    cat,
    businesses,
    townGroups: groupCategoryBusinessesByTown(businesses),
  };
}

export async function buildCategoryHubMetadata(slug: string): Promise<Metadata> {
  const cat = await loadCategory(slug);
  if (!cat) return { title: "Category" };

  const path = categoryHubPath(slug);
  const fallbackTitle = `${cat.title} on 30A, Florida`;
  const fallbackDescription = `Find the best ${cat.title.toLowerCase()} along Scenic 30A in South Walton, Florida. Browse local options across Rosemary Beach, Seaside, WaterColor, Alys Beach, Inlet Beach, and more.`;
  const meta = categoryHubMetadataFromAudit(slug, path, fallbackTitle, fallbackDescription);

  return {
    ...canonicalAlternates(path),
    ...meta,
    keywords: [
      `${cat.title.toLowerCase()} 30A`,
      `${cat.title.toLowerCase()} South Walton`,
      `best ${cat.title.toLowerCase()} 30A Florida`,
      `${cat.title.toLowerCase()} Rosemary Beach`,
      `${cat.title.toLowerCase()} Seaside Florida`,
      `30A ${cat.title.toLowerCase()}`,
    ],
  };
}
