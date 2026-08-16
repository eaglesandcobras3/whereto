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

/** Default map zoom when jumping to a single town center. */
export const TOWN_JUMP_ZOOM_SINGLE = 14;
/** Default map zoom when jumping to multiple town centers. */
export const TOWN_JUMP_ZOOM_MULTI = 12;
/** Padding around town centers when converting a jump into a search bbox (km). */
export const TOWN_JUMP_PADDING_KM = 2.5;

const EARTH_RADIUS_KM = 6371;

function kmToLatDegrees(km: number): number {
  return (km / EARTH_RADIUS_KM) * (180 / Math.PI);
}

function kmToLngDegrees(km: number, atLat: number): number {
  const cos = Math.cos((atLat * Math.PI) / 180);
  if (Math.abs(cos) < 1e-6) return kmToLatDegrees(km);
  return kmToLatDegrees(km) / cos;
}

/**
 * Build a search bbox around one or more map points (town centers).
 * Used so town selection in map mode jumps the viewport instead of town_id filtering.
 */
export function bboxAroundMapPoints(
  points: ReadonlyArray<{ lat: number; lng: number }>,
  paddingKm: number = TOWN_JUMP_PADDING_KM,
): DiscoverBbox | null {
  const valid = points.filter(
    (p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.lat >= -90 && p.lat <= 90,
  );
  if (!valid.length || !(paddingKm > 0)) return null;

  let south = Infinity;
  let north = -Infinity;
  let west = Infinity;
  let east = -Infinity;

  for (const p of valid) {
    const dLat = kmToLatDegrees(paddingKm);
    const dLng = kmToLngDegrees(paddingKm, p.lat);
    south = Math.min(south, p.lat - dLat);
    north = Math.max(north, p.lat + dLat);
    west = Math.min(west, p.lng - dLng);
    east = Math.max(east, p.lng + dLng);
  }

  if (!(south < north) || !(west < east)) return null;

  return {
    south: roundDiscoverCoord(Math.max(-90, south)),
    west: roundDiscoverCoord(Math.max(-180, west)),
    north: roundDiscoverCoord(Math.min(90, north)),
    east: roundDiscoverCoord(Math.min(180, east)),
  };
}

export function townJumpZoom(pointCount: number): number {
  return pointCount > 1 ? TOWN_JUMP_ZOOM_MULTI : TOWN_JUMP_ZOOM_SINGLE;
}
