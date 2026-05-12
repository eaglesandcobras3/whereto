import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { distanceMeters, nameSimilarity } from "@/lib/admin/duplicate-detection";
import { BROWSE_VISIBLE_NOT_HIDDEN } from "@/lib/shop/public-listing-filters";

export type SimilarBusinessHit = {
  id: string;
  title: string;
  slug: string;
  similarity: number;
};

const STORED_DUP_THRESHOLD = 0.82;
const RESPONSE_THRESHOLD = 0.72;
const MAX_DISTANCE_M = 400;

/** Same-town name similarity (plus optional distance when coords exist). */
export async function findSimilarBusinessesForListingRequest(
  supabase: SupabaseClient,
  params: {
    title: string;
    townId: string;
    mapLat?: number | null;
    mapLng?: number | null;
  },
): Promise<{ responseHits: SimilarBusinessHit[]; duplicateIdsForRow: string[] }> {
  const { data, error } = await supabase
    .from("businesses")
    .select("id, title, slug, town_id, map_lat, map_lng")
    .eq("town_id", params.townId)
    .is("archived_at", null)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .limit(500);

  if (error) throw error;

  const rows = (data ?? []) as {
    id: string;
    title: string | null;
    slug: string;
    map_lat: number | null;
    map_lng: number | null;
  }[];

  const lat =
    params.mapLat != null && Number.isFinite(params.mapLat) ? params.mapLat : null;
  const lng =
    params.mapLng != null && Number.isFinite(params.mapLng) ? params.mapLng : null;

  const responseHits: SimilarBusinessHit[] = [];
  const duplicateIdsForRow: string[] = [];

  for (const row of rows) {
    const t = (row.title ?? "").trim();
    if (!t) continue;
    const sim = nameSimilarity(params.title, t);
    if (sim < RESPONSE_THRESHOLD) continue;

    if (lat != null && lng != null && row.map_lat != null && row.map_lng != null) {
      const d = distanceMeters(lat, lng, row.map_lat, row.map_lng);
      if (d > MAX_DISTANCE_M && sim < 0.92) continue;
    }

    responseHits.push({
      id: row.id,
      title: t,
      slug: row.slug,
      similarity: Math.round(sim * 1000) / 1000,
    });
    if (sim >= STORED_DUP_THRESHOLD) {
      duplicateIdsForRow.push(row.id);
    }
  }

  responseHits.sort((a, b) => b.similarity - a.similarity || a.title.localeCompare(b.title));
  return { responseHits: responseHits.slice(0, 12), duplicateIdsForRow };
}
