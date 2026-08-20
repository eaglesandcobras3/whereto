import { getServiceSupabase } from "@/lib/supabase/service-role";
import { getPublicImageUrlWithView } from "@/lib/media/public-image-url";
import { businessListingImageUrl } from "@/lib/media/place-photo";

export type TownCorridorDirection = "west" | "east";

export type TownCorridorNeighbor = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  miles: number;
  direction: TownCorridorDirection;
};

export type TownCorridorCurrent = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
};

export type TownCorridorData = {
  current: TownCorridorCurrent;
  west: TownCorridorNeighbor[];
  east: TownCorridorNeighbor[];
};

type RelationshipRow = {
  town_id: string;
  on_corridor: boolean;
  west_1_town_id: string | null;
  west_1_miles: number | string | null;
  west_2_town_id: string | null;
  west_2_miles: number | string | null;
  east_1_town_id: string | null;
  east_1_miles: number | string | null;
  east_2_town_id: string | null;
  east_2_miles: number | string | null;
};

type TownViewRow = {
  id: string;
  title: string;
  slug: string;
  main_image: string | null;
  hero_image: string | null;
  main_image_url: string | null;
  hero_image_url: string | null;
};

function parseMiles(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 10) / 10;
}

function townImageUrl(row: TownViewRow): string | null {
  return businessListingImageUrl(
    getPublicImageUrlWithView(
      row.main_image_url,
      row.hero_image_url,
      row.main_image,
      row.hero_image,
    ),
  );
}

/**
 * Load corridor timeline data for a town detail page.
 * Returns null when missing, off-corridor, or the table is unavailable.
 */
export async function getTownRelationshipCorridor(
  townId: string,
): Promise<TownCorridorData | null> {
  if (!townId) return null;

  const supabase = getServiceSupabase();

  // Table may lag generated database.types.ts — service client is untyped.
  const { data: relRaw, error: relError } = await supabase
    .from("town_relationships")
    .select(
      "town_id, on_corridor, west_1_town_id, west_1_miles, west_2_town_id, west_2_miles, east_1_town_id, east_1_miles, east_2_town_id, east_2_miles",
    )
    .eq("town_id", townId)
    .maybeSingle();

  if (relError) {
    console.error("getTownRelationshipCorridor", { townId, error: relError });
    return null;
  }
  if (!relRaw) return null;

  const rel = relRaw as unknown as RelationshipRow;
  if (!rel.on_corridor) return null;

  const neighborIds = [
    rel.west_2_town_id,
    rel.west_1_town_id,
    rel.town_id,
    rel.east_1_town_id,
    rel.east_2_town_id,
  ].filter((id): id is string => Boolean(id));

  const uniqueIds = [...new Set(neighborIds)];
  const { data: townRows, error: townsError } = await supabase
    .from("towns_view")
    .select("id, title, slug, main_image, hero_image, main_image_url, hero_image_url")
    .in("id", uniqueIds);

  if (townsError) {
    console.error("getTownRelationshipCorridor towns", { townId, error: townsError });
    return null;
  }

  const byId = new Map<string, TownViewRow>();
  for (const row of townRows ?? []) {
    const t = row as TownViewRow;
    byId.set(String(t.id), t);
  }

  const currentRow = byId.get(rel.town_id);
  if (!currentRow) return null;

  const toNeighbor = (
    id: string | null,
    milesRaw: number | string | null,
    direction: TownCorridorDirection,
  ): TownCorridorNeighbor | null => {
    if (!id) return null;
    const miles = parseMiles(milesRaw);
    if (miles == null) return null;
    const town = byId.get(id);
    if (!town?.slug) return null;
    return {
      id: String(town.id),
      name: town.title,
      slug: town.slug,
      imageUrl: townImageUrl(town),
      miles,
      direction,
    };
  };

  // west array is farthest → nearest (left-to-right on the timeline).
  const west: TownCorridorNeighbor[] = [];
  const west2 = toNeighbor(rel.west_2_town_id, rel.west_2_miles, "west");
  const west1 = toNeighbor(rel.west_1_town_id, rel.west_1_miles, "west");
  if (west2) west.push(west2);
  if (west1) west.push(west1);

  const east: TownCorridorNeighbor[] = [];
  const east1 = toNeighbor(rel.east_1_town_id, rel.east_1_miles, "east");
  const east2 = toNeighbor(rel.east_2_town_id, rel.east_2_miles, "east");
  if (east1) east.push(east1);
  if (east2) east.push(east2);

  if (west.length === 0 && east.length === 0) return null;

  return {
    current: {
      id: String(currentRow.id),
      name: currentRow.title,
      slug: currentRow.slug,
      imageUrl: townImageUrl(currentRow),
    },
    west,
    east,
  };
}
