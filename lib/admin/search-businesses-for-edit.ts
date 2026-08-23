import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminBusinessSearchHit = {
  id: string;
  title: string;
  slug: string;
  town_title: string | null;
  status: string | null;
};

const MIN_QUERY_LENGTH = 2;
const DEFAULT_LIMIT = 16;
const MAX_LIMIT = 30;

function sanitizeIlikePattern(raw: string): string {
  return raw.replace(/[%_,]/g, "").trim();
}

/** Admin picker: title or slug, all non-archived statuses. */
export async function searchBusinessesForAdminEdit(
  supabase: SupabaseClient,
  query: string,
  limit = DEFAULT_LIMIT,
): Promise<AdminBusinessSearchHit[]> {
  const q = sanitizeIlikePattern(query);
  if (q.length < MIN_QUERY_LENGTH) return [];

  const pattern = `%${q}%`;
  const capped = Math.min(Math.max(limit, 1), MAX_LIMIT);

  const { data, error } = await supabase
    .from("businesses")
    .select("id, title, slug, status, towns ( title )")
    .is("archived_at", null)
    .or(`title.ilike.${pattern},slug.ilike.${pattern}`)
    .order("title", { ascending: true })
    .limit(capped);

  if (error) throw error;

  return (data ?? []).map((row) => {
    const townRel = row.towns as { title?: string } | { title?: string }[] | null;
    const town = Array.isArray(townRel) ? townRel[0] : townRel;
    return {
      id: String(row.id),
      title: String(row.title ?? ""),
      slug: String(row.slug ?? ""),
      town_title: town?.title ? String(town.title) : null,
      status: row.status != null ? String(row.status) : null,
    };
  });
}

/** Resolve a business UUID from slug or id param for deep links. */
export async function resolveBusinessIdForAdminEdit(
  supabase: SupabaseClient,
  ref: string,
): Promise<string | null> {
  const trimmed = ref.trim();
  if (!trimmed) return null;

  const uuidLike =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed);

  if (uuidLike) {
    const { data } = await supabase
      .from("businesses")
      .select("id")
      .eq("id", trimmed)
      .is("archived_at", null)
      .maybeSingle();
    return data?.id ? String(data.id) : null;
  }

  const { data } = await supabase
    .from("businesses")
    .select("id")
    .eq("slug", trimmed)
    .is("archived_at", null)
    .maybeSingle();
  return data?.id ? String(data.id) : null;
}

export const ADMIN_BUSINESS_SEARCH_MIN_QUERY = MIN_QUERY_LENGTH;
