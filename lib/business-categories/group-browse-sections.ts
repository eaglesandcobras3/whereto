import { sortBrowseBusinesses } from "@/lib/data/place-category-shared";
import type { BrowseBusinessPreview } from "@/lib/data/place-category-shared";
import {
  browseSectionForCategorySlug,
  browseSectionIcon,
  listUnifiedRollupOrder,
} from "@/lib/categories/unified-browse";
import {
  BUSINESS_CATEGORY_GROUP_SLUGS,
  type BusinessCategoryGroupSlug,
} from "@/lib/business-categories/groups";

export type BrowseGroupSection = {
  id: string;
  title: string;
  slug: string;
  businesses: BrowseBusinessPreview[];
  totalCount: number;
};

type BrowseBusinessLike = BrowseBusinessPreview & {
  categorySlug?: string | null;
};

/** Merge listings into unified rollups (preferred) or legacy browse groups. */
export function groupBusinessesIntoBrowseSections(
  businesses: BrowseBusinessLike[],
): BrowseGroupSection[] {
  const pools = new Map<string, { title: string; pool: BrowseBusinessPreview[] }>();

  for (const business of businesses) {
    const section = browseSectionForCategorySlug(business.categorySlug ?? null);
    if (!section) continue;
    if (!pools.has(section.id)) {
      pools.set(section.id, { title: section.title, pool: [] });
    }
    const { categorySlug: _categorySlug, ...preview } = business;
    pools.get(section.id)!.pool.push(preview);
  }

  const preferredOrder = [
    ...listUnifiedRollupOrder(),
    ...BUSINESS_CATEGORY_GROUP_SLUGS,
  ];
  const seen = new Set<string>();
  const sections: BrowseGroupSection[] = [];

  for (const id of preferredOrder) {
    if (seen.has(id)) continue;
    seen.add(id);
    const entry = pools.get(id);
    if (!entry || entry.pool.length === 0) continue;
    const pool = sortBrowseBusinesses(entry.pool);
    sections.push({
      id,
      title: entry.title,
      slug: id,
      businesses: pool,
      totalCount: pool.length,
    });
  }

  for (const [id, entry] of pools) {
    if (seen.has(id) || entry.pool.length === 0) continue;
    const pool = sortBrowseBusinesses(entry.pool);
    sections.push({
      id,
      title: entry.title,
      slug: id,
      businesses: pool,
      totalCount: pool.length,
    });
  }

  return sections;
}

export function browseGroupIcon(groupSlug: string): string {
  return browseSectionIcon(groupSlug);
}

/** @deprecated Prefer browseGroupIcon(string) — kept for legacy typed call sites. */
export function browseGroupIconLegacy(
  groupSlug: BusinessCategoryGroupSlug,
): string {
  return browseSectionIcon(groupSlug);
}
