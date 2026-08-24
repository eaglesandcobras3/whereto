import type { AdminBusinessRow } from "@/lib/admin/admin-business-direct-edit";
import type { RelatedCategoriesByCategoryId } from "@/lib/categories/category-related-types";
import type { CategoryLeafOption } from "@/lib/categories/suggested-extra-categories";

export type AdminBusinessGetResponse = {
  business: AdminBusinessRow;
  category_ids: string[];
  multiple_category: boolean;
  relatedCategoriesByCategoryId: RelatedCategoriesByCategoryId;
  options: {
    towns: Array<{ id: string; title: string; slug: string }>;
    areas: Array<{ id: string; title: string; slug: string | null; town_id: string | null }>;
    categories: Array<{
      id: string;
      title: string;
      slug: string;
      parent_category_id: string | null;
    }>;
    categoryLeaves: CategoryLeafOption[];
  };
};
