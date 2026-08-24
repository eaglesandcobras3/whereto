import type { CategoryLeafOption } from "@/lib/categories/suggested-extra-categories";

/** Leaf category UUID → related leaf category UUIDs (sorted). */
export type RelatedCategoriesByCategoryId = Record<string, string[]>;

export type CategoryRelatedLinkRow = {
  category_id: string;
  related_category_id: string;
};

export type AdminBusinessCategoryOptions = {
  categoryLeaves: CategoryLeafOption[];
};
