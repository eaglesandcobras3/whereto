/**
 * Browse grouping for the unified taxonomy (CSV rollups + legacy storefront groups).
 * Prefer rollup from unified leaf slug; fall back to legacy BUSINESS_CATEGORY_GROUP maps.
 */

import {
  BUSINESS_CATEGORY_GROUP_ICONS,
  BUSINESS_CATEGORY_GROUP_LABELS,
  businessCategoryGroupForSlug,
  type BusinessCategoryGroupSlug,
} from "@/lib/business-categories/groups";
import {
  getUnifiedLeaves,
  getUnifiedRollups,
  OLD_STOREFRONT_SLUG_TO_LEAF,
} from "@/lib/categories/unified-taxonomy";

export type BrowseSectionRef = {
  id: string;
  title: string;
  /** Material Symbols name */
  icon: string;
};

const UNIFIED_ROLLUP_ICONS: Record<string, string> = {
  food_and_drink: "restaurant",
  shopping: "shopping_bag",
  things_to_do: "kayaking",
  beauty_and_wellness: "spa",
  medical: "medical_services",
  places_to_stay: "bed",
  professional: "account_balance",
  home_services: "home_repair_service",
  creative_services: "palette",
  automotive: "directions_car",
  marine: "sailing",
  family_and_education: "school",
  technology: "devices",
  retail_services: "storefront",
  rentals: "key",
};

const leafBySlug = new Map(
  getUnifiedLeaves().map((l) => [l.slug, l] as const),
);

const rollupBySlug = new Map(
  getUnifiedRollups().map((r) => [r.slug, r] as const),
);

/** Resolve a category leaf slug (or remapped old slug) to a browse section. */
export function browseSectionForCategorySlug(
  categorySlug: string | null | undefined,
): BrowseSectionRef | null {
  if (!categorySlug?.trim()) return null;
  const raw = categorySlug.trim().toLowerCase();

  const remapped = OLD_STOREFRONT_SLUG_TO_LEAF[raw] ?? raw;
  const leaf = leafBySlug.get(remapped);
  if (leaf) {
    return {
      id: leaf.rollupSlug,
      title: leaf.rollupTitle,
      icon: UNIFIED_ROLLUP_ICONS[leaf.rollupSlug] ?? "category",
    };
  }

  const legacy = businessCategoryGroupForSlug(raw);
  if (legacy) {
    return {
      id: legacy,
      title: BUSINESS_CATEGORY_GROUP_LABELS[legacy],
      icon: BUSINESS_CATEGORY_GROUP_ICONS[legacy],
    };
  }

  return null;
}

export function unifiedRollupPublicSegment(rollupSlug: string): string {
  return rollupSlug.replace(/_/g, "-");
}

export function unifiedRollupFromPublicSegment(segment: string): string | null {
  const norm = segment.trim().toLowerCase().replace(/-/g, "_");
  return rollupBySlug.has(norm) ? norm : null;
}

export function unifiedRollupHubPath(rollupSlug: string): string {
  return `/categories/${unifiedRollupPublicSegment(rollupSlug)}`;
}

export function browseSectionIcon(sectionId: string): string {
  if (UNIFIED_ROLLUP_ICONS[sectionId]) return UNIFIED_ROLLUP_ICONS[sectionId];
  if ((BUSINESS_CATEGORY_GROUP_ICONS as Record<string, string>)[sectionId]) {
    return BUSINESS_CATEGORY_GROUP_ICONS[sectionId as BusinessCategoryGroupSlug];
  }
  return "category";
}

export function isUnifiedRollupSlug(value: string): boolean {
  return rollupBySlug.has(value);
}

export function listUnifiedRollupOrder(): string[] {
  return getUnifiedRollups().map((r) => r.slug);
}
