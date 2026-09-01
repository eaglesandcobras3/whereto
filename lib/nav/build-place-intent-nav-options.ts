import { browseSectionIcon } from "@/lib/categories/unified-browse";
import { getUnifiedLeaves, getUnifiedRollups } from "@/lib/categories/unified-taxonomy";
import type { BrowseGroupSection } from "@/lib/business-categories/group-browse-sections";

export type PlaceIntentNavPlaceOption = {
  slug: string;
  label: string;
};

export type PlaceIntentNavCategoryOption = {
  slug: string;
  label: string;
  icon: string;
};

export type PlaceIntentNavSubcategoryOption = {
  slug: string;
  label: string;
  rollupSlug: string;
};

export function buildTaxonomyPlaceIntentNavOptions(): {
  categories: PlaceIntentNavCategoryOption[];
  subcategories: PlaceIntentNavSubcategoryOption[];
} {
  const categories = getUnifiedRollups().map((rollup) => ({
    slug: rollup.slug,
    label: rollup.title,
    icon: browseSectionIcon(rollup.slug),
  }));
  const subcategories = getUnifiedLeaves().map((leaf) => ({
    slug: leaf.slug,
    label: leaf.title,
    rollupSlug: leaf.rollupSlug,
  }));
  return { categories, subcategories };
}

export function buildPopulatedPlaceIntentNavOptions(
  rollupSections: BrowseGroupSection[],
  leafSections: BrowseGroupSection[],
): {
  categories: PlaceIntentNavCategoryOption[];
  subcategories: PlaceIntentNavSubcategoryOption[];
} {
  const categories = rollupSections.map((section) => ({
    slug: section.slug,
    label: section.title,
    icon: browseSectionIcon(section.slug),
  }));

  const subcategories = leafSections.map((section) => {
    const leaf = getUnifiedLeaves().find((item) => item.slug === section.slug);
    return {
      slug: section.slug,
      label: section.title,
      rollupSlug: leaf?.rollupSlug ?? section.slug,
    };
  });

  return { categories, subcategories };
}
