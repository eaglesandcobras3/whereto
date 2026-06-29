import {
  BUSINESS_CATEGORY_GROUP_ICONS,
  BUSINESS_CATEGORY_GROUP_LABELS,
  BUSINESS_CATEGORY_GROUP_SLUGS,
  businessCategoryGroupForSlug,
  type BusinessCategoryGroupSlug,
} from "@/lib/business-categories/groups";
import { sortBrowseBusinesses } from "@/lib/data/place-category-shared";
import type { BrowseBusinessPreview } from "@/lib/data/place-category-shared";

export type BrowseGroupSection = {
  id: string;
  title: string;
  slug: BusinessCategoryGroupSlug;
  businesses: BrowseBusinessPreview[];
  totalCount: number;
};

type BrowseBusinessLike = BrowseBusinessPreview & {
  categorySlug?: string | null;
};

/** Merge storefront listings into the seven end-user browse groups. */
export function groupBusinessesIntoBrowseSections(
  businesses: BrowseBusinessLike[],
): BrowseGroupSection[] {
  const pools = new Map<BusinessCategoryGroupSlug, BrowseBusinessPreview[]>();
  for (const groupSlug of BUSINESS_CATEGORY_GROUP_SLUGS) {
    pools.set(groupSlug, []);
  }

  for (const business of businesses) {
    const groupSlug = businessCategoryGroupForSlug(business.categorySlug ?? null);
    if (!groupSlug) continue;
    const { categorySlug: _categorySlug, ...preview } = business;
    pools.get(groupSlug)!.push(preview);
  }

  const sections: BrowseGroupSection[] = [];
  for (const groupSlug of BUSINESS_CATEGORY_GROUP_SLUGS) {
    const pool = sortBrowseBusinesses(pools.get(groupSlug) ?? []);
    if (pool.length === 0) continue;
    sections.push({
      id: groupSlug,
      title: BUSINESS_CATEGORY_GROUP_LABELS[groupSlug],
      slug: groupSlug,
      businesses: pool,
      totalCount: pool.length,
    });
  }

  return sections;
}

export function browseGroupIcon(groupSlug: BusinessCategoryGroupSlug): string {
  return BUSINESS_CATEGORY_GROUP_ICONS[groupSlug] ?? "storefront";
}
