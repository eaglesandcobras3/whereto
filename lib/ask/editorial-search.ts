import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";

export async function editorialTextSearch<T>(opts: {
  supabase: SupabaseClient;
  table: "guides_view" | "towns_view" | "areas_view";
  select: string;
  query: string;
  limit: number;
  ilikeColumns: string[];
  /** PostgREST `.or()` filter — e.g. hub browse visibility for towns/areas. */
  hubBrowseOrFilter?: string;
  mapRow: (row: Record<string, unknown>) => T;
}): Promise<T[]> {
  const q = opts.query.trim();
  if (!q) return [];
  const limit = Math.min(opts.limit, 12);

  let textQuery = opts.supabase
    .from(opts.table)
    .select(opts.select)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .is("archived_at", null)
    .textSearch("search_vector", q.split(/\s+/).join(" & "), {
      type: "websearch",
      config: "english",
    })
    .limit(limit);
  if (opts.hubBrowseOrFilter) textQuery = textQuery.or(opts.hubBrowseOrFilter);
  let { data, error } = await textQuery;

  if (error && opts.hubBrowseOrFilter && error.message.includes("include_")) {
    ({ data, error } = await opts.supabase
      .from(opts.table)
      .select(opts.select)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .is("archived_at", null)
      .textSearch("search_vector", q.split(/\s+/).join(" & "), {
        type: "websearch",
        config: "english",
      })
      .limit(limit));
  }

  if (!error && data?.length) {
    return data.map((row) => opts.mapRow(row as unknown as Record<string, unknown>));
  }

  const pattern = `%${q.replace(/%/g, "").replace(/,/g, "")}%`;
  const orParts = opts.ilikeColumns.map((col) => `${col}.ilike.${pattern}`);
  let fallbackQuery = opts.supabase
    .from(opts.table)
    .select(opts.select)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .is("archived_at", null)
    .or(orParts.join(","))
    .limit(limit);
  if (opts.hubBrowseOrFilter) fallbackQuery = fallbackQuery.or(opts.hubBrowseOrFilter);
  let { data: fallback, error: fallbackErr } = await fallbackQuery;
  if (fallbackErr && opts.hubBrowseOrFilter && fallbackErr.message.includes("include_")) {
    ({ data: fallback } = await opts.supabase
      .from(opts.table)
      .select(opts.select)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .is("archived_at", null)
      .or(orParts.join(","))
      .limit(limit));
  }

  return (fallback ?? []).map((row) =>
    opts.mapRow(row as unknown as Record<string, unknown>),
  );
}
