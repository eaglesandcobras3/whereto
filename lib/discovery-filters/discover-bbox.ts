/** Geographic bounding box for storefront map search (`south,west,north,east`). */
export type DiscoverBbox = {
  south: number;
  west: number;
  north: number;
  east: number;
};

const COORD_DECIMALS = 5;

export function roundDiscoverCoord(n: number): number {
  const f = 10 ** COORD_DECIMALS;
  return Math.round(n * f) / f;
}

export function serializeDiscoverBbox(bbox: DiscoverBbox): string {
  return [
    roundDiscoverCoord(bbox.south),
    roundDiscoverCoord(bbox.west),
    roundDiscoverCoord(bbox.north),
    roundDiscoverCoord(bbox.east),
  ].join(",");
}

/** Parse `south,west,north,east` — returns null when invalid. */
export function parseDiscoverBbox(raw: string | null | undefined): DiscoverBbox | null {
  if (!raw?.trim()) return null;
  const parts = raw.split(",").map((p) => Number.parseFloat(p.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [south, west, north, east] = parts;
  if (south >= north || west >= east) return null;
  if (south < -90 || north > 90 || west < -180 || east > 180) return null;
  return {
    south: roundDiscoverCoord(south),
    west: roundDiscoverCoord(west),
    north: roundDiscoverCoord(north),
    east: roundDiscoverCoord(east),
  };
}

export function parseDiscoverZoom(raw: string | null | undefined): number | undefined {
  if (!raw?.trim()) return undefined;
  const z = Number.parseInt(raw, 10);
  if (!Number.isFinite(z) || z < 8 || z > 20) return undefined;
  return z;
}

export function listingInDiscoverBbox(
  lat: number | null | undefined,
  lng: number | null | undefined,
  bbox: DiscoverBbox,
): boolean {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return false;
  }
  return lat >= bbox.south && lat <= bbox.north && lng >= bbox.west && lng <= bbox.east;
}
