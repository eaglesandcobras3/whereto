import type { SupabaseClient } from "@supabase/supabase-js";
import type { LocationRankingScope } from "@/lib/scoring";

export type TownScope = {
  anchorTownId: string;
  adjacentTownIds: string[];
};

/**
 * Legacy shim — the old scoring system used integer town IDs which are incompatible
 * with the current UUID-based towns table. Always returns null scope so callers
 * gracefully skip location-proximity scoring.
 */
export async function loadLocationRankingScope(
  _supabase: SupabaseClient,
  _anchorTownSlug: string | null | undefined,
): Promise<{ scope: LocationRankingScope | null; anchorTownId: number | null }> {
  return { scope: null, anchorTownId: null };
}

/** Returns the anchor town ID and neighbors up to `hops` away from `town_adjacency`. */
export async function loadTownScope(
  supabase: SupabaseClient,
  anchorTownId: string,
  hops = 2,
): Promise<TownScope> {
  const visited = new Set<string>([anchorTownId]);
  let frontier = [anchorTownId];

  for (let hop = 0; hop < hops; hop++) {
    if (frontier.length === 0) break;
    const orFilter = frontier
      .map((id) => `town_id_a.eq.${id},town_id_b.eq.${id}`)
      .join(",");
    const { data: edges } = await supabase
      .from("town_adjacency")
      .select("town_id_a, town_id_b")
      .or(orFilter);

    const nextFrontier: string[] = [];
    for (const e of edges ?? []) {
      const a = String((e as { town_id_a: string }).town_id_a);
      const b = String((e as { town_id_b: string }).town_id_b);
      const neighbor = a === frontier[0] || frontier.includes(a) ? b : a;
      // check both sides
      for (const id of [a, b]) {
        if (!visited.has(id)) {
          visited.add(id);
          nextFrontier.push(id);
        }
      }
    }
    frontier = nextFrontier;
  }

  visited.delete(anchorTownId);
  return { anchorTownId, adjacentTownIds: Array.from(visited) };
}
