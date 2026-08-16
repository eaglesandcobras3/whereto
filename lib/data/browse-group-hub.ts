import "server-only";

import type { Metadata } from "next";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import {
  metaDescriptionSnippet,
  seoTitleSegmentForLayout,
} from "@/lib/seo/metadata-snippets";
import { openGraphForPage } from "@/lib/seo/social-metadata";
import { DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { getPublicImageUrlWithView } from "@/lib/media/public-image-url";
import {
  BUSINESS_CATEGORY_GROUP_LABELS,
  businessCategoryGroupForSlug,
  type BusinessCategoryGroupSlug,
} from "@/lib/business-categories/groups";
import { businessBrowseGroupHubPath } from "@/lib/business-categories/browse-group-nav";
import {
  browseSectionForCategorySlug,
  isUnifiedRollupSlug,
  unifiedRollupHubPath,
} from "@/lib/categories/unified-browse";
import { getUnifiedRollups } from "@/lib/categories/unified-taxonomy";
import {
  groupCategoryBusinessesByTown,
  type CategoryBusinessRow,
  type CategoryTownGroup,
  type HubPresenceFilter,
} from "@/lib/data/category-hub";

const BROWSE_GROUP_BUSINESS_POOL_LIMIT = 2000;

const BROWSE_GROUP_BUSINESS_SELECT =
  "id, slug, title, excerpt, main_image, hero_image, main_image_url, hero_image_url, featured, price_level, is_storefront, is_service_business, towns ( id, title, slug ), business_categories ( slug )";

export type BrowseGroupHubPage = {
  slug: string;
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
    is_storefront: Boolean(row.is_storefront),
    is_service_business: Boolean(row.is_service_business),
  };
}

function sectionTitle(sectionId: string): string {
  if (isUnifiedRollupSlug(sectionId)) {
    return getUnifiedRollups().find((r) => r.slug === sectionId)?.title ?? sectionId;
  }
  return (
    BUSINESS_CATEGORY_GROUP_LABELS[sectionId as BusinessCategoryGroupSlug] ?? sectionId
  );
}

function sectionPath(sectionId: string): string {
  if (isUnifiedRollupSlug(sectionId)) return unifiedRollupHubPath(sectionId);
  return businessBrowseGroupHubPath(sectionId as BusinessCategoryGroupSlug);
}

export async function loadBrowseGroupHubPage(
  groupSlug: string,
  presence: HubPresenceFilter = "all",
): Promise<BrowseGroupHubPage | null> {
  const supabase = getServiceSupabase();
  let query = supabase
    .from("businesses_view")
    .select(BROWSE_GROUP_BUSINESS_SELECT)
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .order("featured", { ascending: false })
    .order("title", { ascending: true })
    .limit(BROWSE_GROUP_BUSINESS_POOL_LIMIT);

  if (presence === "storefront") query = query.eq("is_storefront", true);
  if (presence === "service") query = query.eq("is_service_business", true);

  const { data, error } = await query;

  if (error) {
    console.error("browse group hub: businesses query", error);
    return null;
  }

  const businesses: CategoryBusinessRow[] = [];
  for (const row of data ?? []) {
    const r = row as Record<string, unknown>;
    const cat = r.business_categories as { slug?: string } | null;
    const slug = cat?.slug ?? null;
    const section = browseSectionForCategorySlug(slug);
    const legacy = businessCategoryGroupForSlug(slug);
    if (section?.id !== groupSlug && legacy !== groupSlug) continue;
    businesses.push(mapBrowseGroupBusinessRow(r));
  }

  if (businesses.length === 0) return null;

  return {
    slug: groupSlug,
    title: sectionTitle(groupSlug),
    businesses,
    townGroups: groupCategoryBusinessesByTown(businesses),
  };
}

export type BrowseGroupLeafLink = {
  title: string;
  slug: string;
  listingCount: number;
};

/** Leaf category hubs that contribute listings to this browse rollup/group. */
export async function listLeafLinksForBrowseGroup(
  groupSlug: string,
): Promise<BrowseGroupLeafLink[]> {
  const { loadUnifiedCategoryOptions } = await import(
    "@/lib/categories/load-unified-categories"
  );
  const options = await loadUnifiedCategoryOptions();
  const counts = new Map<string, number>();

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("businesses_view")
    .select("primary_category_id, business_categories ( slug )")
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .limit(BROWSE_GROUP_BUSINESS_POOL_LIMIT);

  if (error) {
    console.error("browse group leaf links", error);
  }

  for (const row of data ?? []) {
    const r = row as Record<string, unknown>;
    const cat = r.business_categories as { slug?: string } | null;
    const slug = cat?.slug ?? null;
    if (!slug) continue;
    const section = browseSectionForCategorySlug(slug);
    const legacy = businessCategoryGroupForSlug(slug);
    if (section?.id !== groupSlug && legacy !== groupSlug) continue;
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }

  const out: BrowseGroupLeafLink[] = [];
  for (const rollup of options) {
    for (const leaf of rollup.leaves) {
      const listingCount = counts.get(leaf.slug) ?? 0;
      if (listingCount === 0) continue;
      const section = browseSectionForCategorySlug(leaf.slug);
      const legacy = businessCategoryGroupForSlug(leaf.slug);
      if (section?.id !== groupSlug && legacy !== groupSlug) continue;
      out.push({
        title: leaf.title,
        slug: leaf.slug,
        listingCount,
      });
    }
  }

  // Also include any counted leaves not present in unified options (legacy).
  for (const [slug, listingCount] of counts) {
    if (out.some((l) => l.slug === slug)) continue;
    out.push({
      title: slug.replace(/_/g, " "),
      slug,
      listingCount,
    });
  }

  return out.sort((a, b) => b.listingCount - a.listingCount || a.title.localeCompare(b.title));
}

export async function buildBrowseGroupHubMetadata(
  groupSlug: string,
): Promise<Metadata> {
  const hub = await loadBrowseGroupHubPage(groupSlug, "all");
  const title = sectionTitle(groupSlug);
  const path = sectionPath(groupSlug);
  const count = hub?.businesses.length ?? 0;
  const townCount = hub?.townGroups.length ?? 0;
  const description =
    count > 0
      ? `Browse ${count} ${title.toLowerCase()} along Scenic 30A${
          townCount > 0 ? ` across ${townCount} towns` : ""
        }. Open a type hub below for the full by-town listing grid.`
      : `Browse ${title.toLowerCase()} along Scenic 30A in South Walton, Florida — storefronts and service providers by town.`;

  return {
    ...canonicalAlternates(path),
    title: seoTitleSegmentForLayout(`${title} on 30A: Types & Towns`),
    description: metaDescriptionSnippet(description, description),
    robots:
      count > 0
        ? { index: true, follow: true }
        : { index: false, follow: true },
    ...openGraphForPage({
      path,
      title: `${title} on 30A | WhereTo30A`,
      description,
    }),
  };
}
