import "server-only";

import { getServiceSupabase } from "@/lib/supabase/service-role";
import {
  DIRECTUS_PUBLISHED_STATUS,
} from "@/lib/shop/public-listing-filters";
import {
  browseSectionForCategorySlug,
  browseSectionIcon,
  listUnifiedRollupOrder,
} from "@/lib/categories/unified-browse";
import {
  BUSINESS_CATEGORY_GROUP_SLUGS,
  type BusinessCategoryGroupSlug,
} from "@/lib/business-categories/groups";
import type { BusinessBrowseGroupNavItem } from "@/lib/business-categories/browse-group-nav";

export type ListedBusinessBrowseGroup = BusinessBrowseGroupNavItem & {
  listingCount: number;
};

function hrefForSection(id: string): string {
  // Combined directory hub — hash expands the matching rollup section.
  return `/businesses#${id}`;
}

/** Browse groups that have at least one listing (hub / footer). Storefront + service. */
export async function getListedBusinessBrowseGroups(): Promise<ListedBusinessBrowseGroup[]> {
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from("businesses_view")
    .select("id, business_categories ( slug )")
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .limit(5000);

  if (error) {
    console.error("business browse groups: count query", error);
    return [];
  }

  const counts = new Map<string, { title: string; count: number }>();

  for (const row of data ?? []) {
    const cat = (row as { business_categories: { slug?: string } | null }).business_categories;
    const section = browseSectionForCategorySlug(cat?.slug ?? null);
    if (!section) continue;
    const prev = counts.get(section.id);
    if (prev) prev.count += 1;
    else counts.set(section.id, { title: section.title, count: 1 });
  }

  const preferredOrder = [...listUnifiedRollupOrder(), ...BUSINESS_CATEGORY_GROUP_SLUGS];
  const seen = new Set<string>();
  const groups: ListedBusinessBrowseGroup[] = [];

  for (const id of preferredOrder) {
    if (seen.has(id)) continue;
    seen.add(id);
    const entry = counts.get(id);
    if (!entry || entry.count === 0) continue;
    groups.push({
      slug: id as BusinessCategoryGroupSlug,
      title: entry.title,
      icon: browseSectionIcon(id),
      href: hrefForSection(id),
      listingCount: entry.count,
    });
  }

  for (const [id, entry] of counts) {
    if (seen.has(id) || entry.count === 0) continue;
    groups.push({
      slug: id as BusinessCategoryGroupSlug,
      title: entry.title,
      icon: browseSectionIcon(id),
      href: hrefForSection(id),
      listingCount: entry.count,
    });
  }

  return groups;
}
