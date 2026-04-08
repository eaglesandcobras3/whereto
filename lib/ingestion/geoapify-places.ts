import { assertDirectoryIngestionCronContext } from "@/lib/ingestion/directory-cron-context";

const PLACES_URL = "https://api.geoapify.com/v2/places";
const PLACE_DETAILS_URL = "https://api.geoapify.com/v2/place-details";

export type GeoapifyPointFeature = {
  type: "Feature";
  geometry?: { type: string; coordinates?: number[] };
  properties?: Record<string, unknown>;
};

export type GeoapifyFeatureCollection = {
  type: "FeatureCollection";
  features?: GeoapifyPointFeature[];
};

export async function geoapifyPlacesInCircle(
  apiKey: string,
  params: {
    lon: number;
    lat: number;
    radiusMeters: number;
    categories: string[];
    limit?: number;
    offset?: number;
    lang?: string;
  },
): Promise<GeoapifyPointFeature[]> {
  assertDirectoryIngestionCronContext();
  if (!params.categories.length) return [];

  const u = new URL(PLACES_URL);
  u.searchParams.set("apiKey", apiKey);
  u.searchParams.set("categories", params.categories.join(","));
  u.searchParams.set(
    "filter",
    `circle:${params.lon},${params.lat},${params.radiusMeters}`,
  );
  u.searchParams.set("limit", String(params.limit ?? 100));
  u.searchParams.set("offset", String(params.offset ?? 0));
  u.searchParams.set("bias", `proximity:${params.lon},${params.lat}`);
  if (params.lang) u.searchParams.set("lang", params.lang);

  const res = await fetch(u.toString());
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Geoapify Places ${res.status}: ${t}`);
  }
  const json = (await res.json()) as GeoapifyFeatureCollection;
  return (json.features ?? []).filter((f) => f.type === "Feature");
}

export type NormalizedGeoapifyDetails = {
  name?: string;
  address: string | null;
  lat: number;
  lng: number;
  phone: string | null;
  website: string | null;
  hours_json: Record<string, unknown> | null;
};

function pointFromGeometry(
  g: GeoapifyPointFeature["geometry"],
): { lat: number; lng: number } | null {
  if (!g || g.type !== "Point" || !Array.isArray(g.coordinates)) return null;
  const [lng, lat] = g.coordinates;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  return { lat, lng };
}

/**
 * Parse Place Details FeatureCollection; prefers the `details` feature when present.
 */
export function normalizeGeoapifyPlaceDetails(
  fc: GeoapifyFeatureCollection,
  fallbackLat: number,
  fallbackLng: number,
): NormalizedGeoapifyDetails {
  const features = fc.features ?? [];
  let detailsProps: Record<string, unknown> | undefined;
  let point: { lat: number; lng: number } | null = null;

  for (const f of features) {
    const p = f.properties as Record<string, unknown> | undefined;
    if (p?.feature_type === "details") {
      detailsProps = p;
      const pt = pointFromGeometry(f.geometry);
      if (pt) point = pt;
      break;
    }
  }

  if (!detailsProps) {
    for (const f of features) {
      const p = f.properties as Record<string, unknown> | undefined;
      if (p && (p.name || p.formatted || p.website)) {
        detailsProps = p;
        const pt = pointFromGeometry(f.geometry);
        if (pt) point = pt;
        break;
      }
    }
  }

  if (!point) {
    for (const f of features) {
      const pt = pointFromGeometry(f.geometry);
      if (pt) {
        point = pt;
        break;
      }
    }
  }

  const lat = point?.lat ?? fallbackLat;
  const lng = point?.lng ?? fallbackLng;
  const props = detailsProps ?? {};

  const contact = props.contact as { phone?: string } | undefined;
  const website =
    typeof props.website === "string" && props.website.trim()
      ? props.website.trim()
      : null;
  const opening =
    typeof props.opening_hours === "string" && props.opening_hours.trim()
      ? props.opening_hours.trim()
      : null;

  const name =
    typeof props.name === "string" && props.name.trim()
      ? props.name.trim()
      : undefined;
  const formatted =
    typeof props.formatted === "string" && props.formatted.trim()
      ? props.formatted.trim()
      : null;

  return {
    name,
    address: formatted,
    lat,
    lng,
    phone: contact?.phone?.trim() || null,
    website,
    hours_json: opening
      ? { provider: "geoapify", opening_hours_osm: opening }
      : null,
  };
}

export async function geoapifyPlaceDetails(
  apiKey: string,
  placeId: string,
): Promise<GeoapifyFeatureCollection> {
  assertDirectoryIngestionCronContext();
  const u = new URL(PLACE_DETAILS_URL);
  u.searchParams.set("apiKey", apiKey);
  u.searchParams.set("id", placeId);
  u.searchParams.set("lang", "en");

  const res = await fetch(u.toString());
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Geoapify Place Details ${res.status}: ${t}`);
  }
  return (await res.json()) as GeoapifyFeatureCollection;
}

export function geoapifyPlaceIdFromFeature(
  f: GeoapifyPointFeature,
): string | null {
  const p = f.properties as Record<string, unknown> | undefined;
  const id = p?.place_id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

export function geoapifyPropsFromPlaceFeature(
  f: GeoapifyPointFeature,
): {
  placeId: string | null;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  categories: string[];
} {
  const p = (f.properties ?? {}) as Record<string, unknown>;
  const placeId = geoapifyPlaceIdFromFeature(f);
  const name =
    typeof p.name === "string" && p.name.trim() ? p.name.trim() : "Unknown";
  const formatted =
    typeof p.formatted === "string" && p.formatted.trim()
      ? p.formatted.trim()
      : null;
  const catsRaw = p.categories;
  const categories = Array.isArray(catsRaw)
    ? catsRaw.filter((c): c is string => typeof c === "string")
    : [];
  const geom = f.geometry;
  let lat = typeof p.lat === "number" ? p.lat : NaN;
  let lng = typeof p.lon === "number" ? p.lon : NaN;
  if (geom?.type === "Point" && Array.isArray(geom.coordinates)) {
    const [lo, la] = geom.coordinates;
    if (typeof la === "number" && typeof lo === "number") {
      lat = la;
      lng = lo;
    }
  }
  return {
    placeId,
    name,
    address: formatted,
    lat,
    lng,
    categories,
  };
}
