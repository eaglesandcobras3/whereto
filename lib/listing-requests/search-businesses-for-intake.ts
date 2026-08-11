import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BROWSE_VISIBLE_NOT_HIDDEN,
  DIRECTUS_PUBLISHED_STATUS,
} from "@/lib/shop/public-listing-filters";

export type IntakeBusinessSearchHit = {
  id: string;
  title: string;
  slug: string;
  town_title: string | null;
};

const MIN_QUERY_LENGTH = 2;
const DEFAULT_LIMIT = 8;

function sanitizeIlikePattern(raw: string): string {
  return raw.replace(/[%_,]/g, "").trim();
}

/** Title search for free-onboard find/verify typeahead. */
export async function searchBusinessesForIntake(
  supabase: SupabaseClient,
  query: string,
  limit = DEFAULT_LIMIT,
): Promise<IntakeBusinessSearchHit[]> {
  const q = sanitizeIlikePattern(query);
  if (q.length < MIN_QUERY_LENGTH) return [];

  const pattern = `%${q}%`;
  const { data, error } = await supabase
    .from("businesses_view")
    .select("id, title, slug, towns ( title )")
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .ilike("title", pattern)
    .order("title", { ascending: true })
    .limit(Math.min(Math.max(limit, 1), 20));

  if (error) throw error;

  return (data ?? []).map((row) => {
    const townRel = row.towns as
      | { title?: string }
      | { title?: string }[]
      | null;
    const town = Array.isArray(townRel) ? townRel[0] : townRel;
    return {
      id: String(row.id),
      title: String(row.title ?? ""),
      slug: String(row.slug ?? ""),
      town_title: town?.title ? String(town.title) : null,
    };
  });
}

export const INTAKE_BUSINESS_SEARCH_MIN_QUERY = MIN_QUERY_LENGTH;
