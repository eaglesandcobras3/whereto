import "server-only";

import type { Metadata } from "next";
import { getServiceSupabaseOrNull } from "@/lib/supabase/service-role";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import {
  metaDescriptionSnippet,
  seoTitleSegmentForLayout,
} from "@/lib/seo/metadata-snippets";
import { openGraphForPage } from "@/lib/seo/social-metadata";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { getPublicImageUrlWithView } from "@/lib/media/public-image-url";
import {
  businessCategoryGroupForSlug,
  BUSINESS_CATEGORY_GROUP_LABELS,
  type BusinessCategoryGroupSlug,
} from "@/lib/business-categories/groups";
import { businessBrowseGroupHubPath } from "@/lib/business-categories/browse-group-nav";
import {
  groupCategoryBusinessesByTown,
  type CategoryBusinessRow,
  type CategoryTownGroup,
} from "@/lib/data/category-hub";

const BROWSE_GROUP_BUSINESS_POOL_LIMIT = 2000;

const BROWSE_GROUP_BUSINESS_SELECT =
  "id, slug, title, excerpt, main_image, hero_image, main_image_url, hero_image_url, featured, price_level, towns ( id, title, slug ), business_categories ( slug )";

export type BrowseGroupHubPage = {
  slug: BusinessCategoryGroupSlug;
  title: string;
  businesses: CategoryBusinessRow[];
  townGroups: CategoryTownGroup[];
};

function mapBrowseGroupBusinessRow(row: Record<string, unknown>): CategoryBusinessRow {
  const town = row.towns as { id?: string; title?: string; slug?: string } | null;
  const heroUrl = getPublicImageUrlWithView(
    row.main_image_url as string | null,
    row.hero_image_url as string | null,
    row.main_image as string | null,
    row.hero_image as string | null,
  );
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String((row as { title: string }).title),
    excerpt: (row.excerpt as string | null) ?? null,
    hero_image_url: heroUrl,
    featured: Boolean(row.featured),
    price_level: (row.price_level as number | null) ?? null,
    town_id: town?.id ?? null,
    town_name: town?.title ?? null,
    town_slug: town?.slug ?? null,
  };
}

export async function loadBrowseGroupHubPage(
  groupSlug: BusinessCategoryGroupSlug,
): Promise<BrowseGroupHubPage | null> {
  const supabase = getServiceSupabaseOrNull();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("businesses_view")
    .select(BROWSE_GROUP_BUSINESS_SELECT)
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .eq("is_storefront", true)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .order("featured", { ascending: false })
    .order("title", { ascending: true })
    .limit(BROWSE_GROUP_BUSINESS_POOL_LIMIT);

  if (error) {
    console.error("browse group hub: businesses query", error);
    return null;
  }

  const businesses: CategoryBusinessRow[] = [];
  for (const row of data ?? []) {
    const r = row as Record<string, unknown>;
    const cat = r.business_categories as { slug?: string } | null;
    if (businessCategoryGroupForSlug(cat?.slug ?? null) !== groupSlug) continue;
    businesses.push(mapBrowseGroupBusinessRow(r));
  }

  if (businesses.length === 0) return null;

  return {
    slug: groupSlug,
    title: BUSINESS_CATEGORY_GROUP_LABELS[groupSlug],
    businesses,
    townGroups: groupCategoryBusinessesByTown(businesses),
  };
}

export async function buildBrowseGroupHubMetadata(
  groupSlug: BusinessCategoryGroupSlug,
): Promise<Metadata> {
  const title = BUSINESS_CATEGORY_GROUP_LABELS[groupSlug];
  const path = businessBrowseGroupHubPath(groupSlug);
  const seoTitle = seoTitleSegmentForLayout(`${title} on 30A, Florida`);
  const description = metaDescriptionSnippet(
    null,
    `Browse ${title.toLowerCase()} along Scenic 30A in South Walton, Florida — local listings grouped by town across Rosemary Beach, Seaside, WaterColor, Alys Beach, and more.`,
  );

  return {
    ...canonicalAlternates(path),
    title: seoTitle,
    description,
    ...openGraphForPage({
      path,
      title: `${title} on 30A | WhereTo30A`,
      description,
    }),
  };
}
