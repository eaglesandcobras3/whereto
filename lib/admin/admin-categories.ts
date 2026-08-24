import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminCategoryRow = {
  id: string;
  title: string;
  slug: string;
  parent_category_id: string | null;
  parent_title: string | null;
  business_count: number;
};

/** Read-only category browser for operators. */
export async function listAdminCategories(
  supabase: SupabaseClient,
  query?: string,
): Promise<AdminCategoryRow[]> {
  const { data: categories, error } = await supabase
    .from("business_categories")
    .select("id, title, slug, parent_category_id")
    .is("archived_at", null)
    .order("title", { ascending: true });

  if (error) throw error;

  const { data: counts, error: countErr } = await supabase
    .from("businesses")
    .select("primary_category_id")
    .is("archived_at", null);
  if (countErr) throw countErr;

  const countByCategory = new Map<string, number>();
  for (const row of counts ?? []) {
    const id = (row as { primary_category_id: string | null }).primary_category_id;
    if (!id) continue;
    countByCategory.set(id, (countByCategory.get(id) ?? 0) + 1);
  }

  const byId = new Map(
    (categories ?? []).map((c) => [String((c as { id: string }).id), c as { id: string; title: string; slug: string; parent_category_id: string | null }]),
  );

  return (categories ?? [])
    .map((c) => {
    const row = c as {
      id: string;
      title: string;
      slug: string;
      parent_category_id: string | null;
    };
    const parent = row.parent_category_id ? byId.get(row.parent_category_id) : null;
    return {
      id: String(row.id),
      title: String(row.title),
      slug: String(row.slug),
      parent_category_id: row.parent_category_id,
      parent_title: parent?.title ?? null,
      business_count: countByCategory.get(row.id) ?? 0,
    };
  })
    .filter((row) => {
      const needle = query?.trim().toLowerCase() ?? "";
      if (!needle) return true;
      const hay = [
        row.title,
        row.slug,
        row.parent_title ?? "",
        row.slug.replace(/_/g, " "),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
}
