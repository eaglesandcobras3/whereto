import type { SupabaseClient } from "@supabase/supabase-js";
import type { LocationRankingScope } from "@/lib/scoring";

export async function loadLocationRankingScope(
  supabase: SupabaseClient,
  anchorTownSlug: string | null | undefined,
): Promise<{
  scope: LocationRankingScope | null;
  anchorTownId: number | null;
}> {
  if (!anchorTownSlug) {
    return { scope: null, anchorTownId: null };
  }
  const { data: town } = await supabase
    .from("towns")
    .select("id, region_id")
    .eq("slug", anchorTownSlug)
    .maybeSingle();
  if (!town?.id) {
    return { scope: null, anchorTownId: null };
  }
  const anchorId = town.id as number;
  const { data: edges } = await supabase
    .from("town_adjacency")
    .select("town_id_a, town_id_b")
    .or(`town_id_a.eq.${anchorId},town_id_b.eq.${anchorId}`);
  const adjacentTownIds = new Set<number>();
  for (const e of edges ?? []) {
    const a = e.town_id_a as number;
    const b = e.town_id_b as number;
    if (a === anchorId) adjacentTownIds.add(b);
    else adjacentTownIds.add(a);
  }
  const regionTownIds = new Set<number>();
  const rid = town.region_id as number | null;
  if (rid != null) {
    const { data: inRegion } = await supabase
      .from("towns")
      .select("id")
      .eq("region_id", rid);
    for (const row of inRegion ?? []) {
      const id = row.id as number;
      if (id === anchorId) continue;
      if (adjacentTownIds.has(id)) continue;
      regionTownIds.add(id);
    }
  }
  return {
    scope: {
      anchorTownId: anchorId,
      adjacentTownIds,
      regionTownIds,
    },
    anchorTownId: anchorId,
  };
}
