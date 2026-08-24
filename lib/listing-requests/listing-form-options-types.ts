import type { CategoryRollupOption } from "@/lib/categories/load-unified-categories";
import type { RelatedCategoriesByCategoryId } from "@/lib/categories/category-related-types";
import type { DiscoverSearchTagOption } from "@/lib/discovery-filters/load-discover-options";

export type ListingFormCategoryOption = {
  id: string;
  title: string;
  slug: string;
  rollupTitle?: string | null;
  rollupSlug?: string | null;
};

export type ListingFormOptionsResponse = {
  /** @deprecated Prefer categoryGroups. */
  categories: ListingFormCategoryOption[];
  categoryGroups: CategoryRollupOption[];
  /** @deprecated Prefer searchTagOptions. */
  searchTags: string[];
  searchTagOptions: DiscoverSearchTagOption[];
  tagsByCategoryId: Record<string, string[]>;
  relatedCategoriesByCategoryId: RelatedCategoriesByCategoryId;
  isAdmin: boolean;
  adminName: string | null;
  adminEmail: string | null;
};
