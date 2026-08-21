import { sortBrowseBusinesses } from "@/lib/data/place-category-shared";
import type { BrowseBusinessPreview } from "@/lib/data/place-category-shared";
import {
  browseSectionBySlug,
  browseSectionForCategorySlug,
  browseSectionIcon,
  listUnifiedRollupOrder,
} from "@/lib/categories/unified-browse";
import {
  getUnifiedLeaves,
  OLD_STOREFRONT_SLUG_TO_LEAF,
} from "@/lib/categories/unified-taxonomy";
import {
  BUSINESS_CATEGORY_GROUP_SLUGS,
  type BusinessCategoryGroupSlug,
} from "@/lib/business-categories/groups";
import { displayStorefrontCategoryTitle } from "@/lib/routes/storefront-category-labels";
import { normalizeBusinessCategorySlug } from "@/lib/search/category-slugs";

export type BrowseGroupSection = {
  id: string;
  title: string;
  slug: string;
  businesses: BrowseBusinessPreview[];
  totalCount: number;
};

type BrowseBusinessLike = BrowseBusinessPreview & {
  categorySlug?: string | null;
  categoryTitle?: string | null;
};

const leafBySlug = new Map(getUnifiedLeaves().map((leaf) => [leaf.slug, leaf] as const));

/** Normalize a town/area intent URL segment (hyphens or underscores). */
export function normalizeIntentSlug(segment: string): string {
  return segment.trim().toLowerCase().replace(/-/g, "_");
}

function resolveLeafSlug(categorySlug: string | null | undefined): string | null {
  if (!categorySlug?.trim()) return null;
  const raw = normalizeBusinessCategorySlug(categorySlug) ?? categorySlug.trim().toLowerCase();
  const remapped = OLD_STOREFRONT_SLUG_TO_LEAF[raw] ?? raw;
  if (leafBySlug.has(remapped)) return remapped;
  // Allow published DB leaf slugs that are not in the CSV taxonomy yet, but never
  // treat a rollup/browse-group id as a leaf (those stay rollup intents).
  if (browseSectionBySlug(remapped)) return null;
  return remapped;
}

function leafTitleForSlug(leafSlug: string, fallbackTitle?: string | null): string {
  const leaf = leafBySlug.get(leafSlug);
  if (leaf) return leaf.title;
  if (fallbackTitle?.trim()) {
    return displayStorefrontCategoryTitle(leafSlug, fallbackTitle.trim());
  }
  return displayStorefrontCategoryTitle(leafSlug, leafSlug.replace(/_/g, " "));
}

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
    const { categorySlug: _categorySlug, categoryTitle: _categoryTitle, ...preview } =
      business;
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

/**
 * Group listings by leaf category slug (populated sections only).
 * Used for town leaf intent pages + sitemap.
 */
export function groupBusinessesIntoLeafSections(
  businesses: BrowseBusinessLike[],
): BrowseGroupSection[] {
  const pools = new Map<string, { title: string; pool: BrowseBusinessPreview[] }>();

  for (const business of businesses) {
    const leafSlug = resolveLeafSlug(business.categorySlug ?? null);
    if (!leafSlug) continue;
    if (!pools.has(leafSlug)) {
      pools.set(leafSlug, {
        title: leafTitleForSlug(leafSlug, business.categoryTitle),
        pool: [],
      });
    }
    const { categorySlug: _categorySlug, categoryTitle: _categoryTitle, ...preview } =
      business;
    pools.get(leafSlug)!.pool.push(preview);
  }

  const preferredOrder = getUnifiedLeaves().map((leaf) => leaf.slug);
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

/** Hub rollup for an intent URL: populated section if it exists, otherwise an empty valid section. */
export function resolveIntentBrowseSection(
  populatedSections: BrowseGroupSection[],
  intentSlug: string,
): BrowseGroupSection | null {
  const normalized = normalizeIntentSlug(intentSlug);
  if (!normalized) return null;

  const populated = populatedSections.find((section) => section.slug === normalized);
  if (populated) return populated;

  const ref = browseSectionBySlug(normalized);
  if (!ref) return null;

  return {
    id: ref.id,
    title: ref.title,
    slug: ref.id,
    businesses: [],
    totalCount: 0,
  };
}

/**
 * Resolve a town intent URL to a rollup section (including empty rollups) or a
 * populated leaf category section. Empty leaves 404 — only list when businesses exist.
 */
export function resolveTownIntentSection(
  rollupSections: BrowseGroupSection[],
  leafSections: BrowseGroupSection[],
  intentSlug: string,
): BrowseGroupSection | null {
  const normalized = normalizeIntentSlug(intentSlug);
  if (!normalized) return null;

  const rollup = resolveIntentBrowseSection(rollupSections, normalized);
  if (rollup) return rollup;

  const leaf = leafSections.find(
    (section) => section.slug === normalized && section.businesses.length > 0,
  );
  return leaf ?? null;
}

/** True when a category hub slug can link to `/town/{town}/{slug}` (rollup or leaf). */
export function isTownIntentCategorySlug(categorySlug: string): boolean {
  const normalized = normalizeIntentSlug(categorySlug);
  if (!normalized) return false;
  if (browseSectionBySlug(normalized)) return true;
  return resolveLeafSlug(normalized) != null;
}

/** @deprecated Prefer browseGroupIcon(string) — kept for legacy typed call sites. */
export function browseGroupIconLegacy(
  groupSlug: BusinessCategoryGroupSlug,
): string {
  return browseSectionIcon(groupSlug);
}
