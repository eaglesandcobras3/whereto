import "server-only";

import { getServiceSupabase } from "@/lib/supabase/service-role";
import { listUnifiedRollupOrder } from "@/lib/categories/unified-browse";
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

/**
 * Hub directory sections: rollups ordered like the taxonomy, only those with leaves.
 * Used by `/businesses` as the taxonomy link directory (not business cards).
 */
export async function loadCategoryHubLinkSections(): Promise<CategoryRollupOption[]> {
  const options = await loadUnifiedCategoryOptions();
  const bySlug = new Map(options.map((o) => [o.slug, o]));
  const preferred = listUnifiedRollupOrder();
  const seen = new Set<string>();
  const out: CategoryRollupOption[] = [];

  for (const slug of preferred) {
    const section = bySlug.get(slug);
    if (!section || section.leaves.length === 0) continue;
    seen.add(slug);
    // Use taxonomy slug as id so `/businesses#food_and_drink` hash expand still works.
    out.push({ ...section, id: section.slug });
  }

  for (const section of options) {
    if (seen.has(section.slug) || section.leaves.length === 0) continue;
    out.push({ ...section, id: section.slug });
  }

  return out;
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
