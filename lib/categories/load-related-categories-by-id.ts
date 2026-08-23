import type { SupabaseClient } from "@supabase/supabase-js";

const PAGE = 1000;

type LinkRow = { category_id: string; related_category_id: string };

function isMissingRelatedTable(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("category_related_categories") && lower.includes("does not exist");
}

async function fetchAllLinks(
  supabase: SupabaseClient,
): Promise<{ data: LinkRow[]; error: string | null }> {
  const out: LinkRow[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("category_related_categories")
      .select("category_id, related_category_id")
      .range(from, from + PAGE - 1);
    if (error) return { data: [], error: error.message };
    const batch = (data ?? []) as LinkRow[];
    out.push(...batch);
    if (batch.length < PAGE) break;
    from += PAGE;
  }
  return { data: out, error: null };
}

/** Build leaf UUID → related leaf UUIDs (sorted). Returns {} when table is not migrated yet. */
export function buildRelatedCategoriesByCategoryId(
  links: LinkRow[],
): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const link of links) {
    const categoryId = String(link.category_id ?? "").trim();
    const relatedId = String(link.related_category_id ?? "").trim();
    if (!categoryId || !relatedId || categoryId === relatedId) continue;
    const list = map[categoryId] ?? (map[categoryId] = []);
    if (!list.includes(relatedId)) list.push(relatedId);
  }
  for (const id of Object.keys(map)) {
    map[id].sort((a, b) => a.localeCompare(b));
  }
  return map;
}

export async function loadRelatedCategoriesByCategoryId(
  supabase: SupabaseClient,
): Promise<Record<string, string[]>> {
  const { data, error } = await fetchAllLinks(supabase);
  if (error) {
    if (isMissingRelatedTable(error)) return {};
    throw new Error(error);
  }
  return buildRelatedCategoriesByCategoryId(data);
}
