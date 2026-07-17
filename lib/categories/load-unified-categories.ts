import "server-only";

import { getServiceSupabase } from "@/lib/supabase/service-role";
import { DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";

export type CategoryRollupOption = {
  id: string;
  title: string;
  slug: string;
  leaves: Array<{ id: string; title: string; slug: string }>;
};

/** Published unified taxonomy: rollups with leaf children from business_categories. */
export async function loadUnifiedCategoryOptions(): Promise<CategoryRollupOption[]> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("business_categories")
    .select("id, title, slug, parent_category_id")
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .order("title", { ascending: true });
  if (error) {
    console.error("loadUnifiedCategoryOptions", error);
    return [];
  }

  const rows = data ?? [];
  const rollups = rows.filter((r) => !r.parent_category_id);
  const leaves = rows.filter((r) => r.parent_category_id);

  return rollups.map((r) => ({
    id: String(r.id),
    title: String(r.title ?? ""),
    slug: String(r.slug ?? ""),
    leaves: leaves
      .filter((l) => String(l.parent_category_id) === String(r.id))
      .map((l) => ({
        id: String(l.id),
        title: String(l.title ?? ""),
        slug: String(l.slug ?? ""),
      })),
  }));
}

export async function loadFlatUnifiedLeaves(): Promise<
  Array<{ id: string; title: string; slug: string; rollupTitle: string; rollupSlug: string }>
> {
  const groups = await loadUnifiedCategoryOptions();
  return groups.flatMap((g) =>
    g.leaves.map((l) => ({
      ...l,
      rollupTitle: g.title,
      rollupSlug: g.slug,
    })),
  );
}
