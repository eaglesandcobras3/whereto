import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeServiceCategorySlug } from "@/lib/service-categories/normalize";

export type ResolvedServiceCategoryFilter = {
  filterServiceCategoryIds: string[];
  explicitServiceCategoryId: string | null;
  resolvedServiceCategorySlugs: string[];
};

export async function resolveServiceCategoryFilter(
  supabase: SupabaseClient,
  explicitSlugs: string[],
): Promise<ResolvedServiceCategoryFilter> {
  const normalized = [
    ...new Set(
      explicitSlugs
        .map((s) => normalizeServiceCategorySlug(s))
        .filter((s): s is string => Boolean(s)),
    ),
  ];

  if (!normalized.length) {
    return {
      filterServiceCategoryIds: [],
      explicitServiceCategoryId: null,
      resolvedServiceCategorySlugs: [],
    };
  }

  const { data: cats } = await supabase
    .from("service_categories")
    .select("id, slug")
    .is("archived_at", null)
    .eq("status", "published")
    .in("slug", normalized);

  const filterServiceCategoryIds = (cats ?? []).map((c) => String((c as { id: string }).id));
  const resolvedServiceCategorySlugs = (cats ?? []).map((c) =>
    String((c as { slug: string }).slug),
  );

  return {
    filterServiceCategoryIds,
    explicitServiceCategoryId:
      filterServiceCategoryIds.length === 1 ? filterServiceCategoryIds[0] : null,
    resolvedServiceCategorySlugs,
  };
}
