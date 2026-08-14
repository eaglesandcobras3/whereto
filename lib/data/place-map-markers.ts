import "server-only";

import type { BusinessMapMarker } from "@/lib/data/business-map-markers";
import { townPagePath } from "@/lib/routes/town-page-path";
import { TOWN_GEO_COORDINATES } from "@/lib/seo/town-coordinates";
import { getServiceSupabase } from "@/lib/supabase/service-role";

/** Content-compiler fallback when town markdown has no lat/lng — not usable as a real pin. */
function isCompilerDefaultCoord(lat: number, lng: number): boolean {
  return Math.abs(lat - 30.3) < 0.0005 && Math.abs(lng - -86.1) < 0.0005;
}

function validCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !isCompilerDefaultCoord(lat, lng)
  );
}

/**
 * Hub map pins for published towns that have usable `map_lat` / `map_lng`.
 * Falls back to SEO seed coords for known slugs when DB coords are missing.
 */
export async function listTownHubMapMarkers(
  towns: { id: string; name: string; slug: string; hero_image_url?: string | null }[],
): Promise<BusinessMapMarker[]> {
  if (towns.length === 0) return [];

  const supabase = getServiceSupabase();
  const ids = towns.map((t) => t.id);
  const byId = new Map<string, { lat: number; lng: number }>();

  for (let i = 0; i < ids.length; i += 120) {
    const chunk = ids.slice(i, i + 120);
    const { data, error } = await supabase
      .from("towns")
      .select("id, map_lat, map_lng")
      .in("id", chunk);
    if (error) {
      console.error("town hub map markers:", error.message);
      break;
    }
    for (const row of data ?? []) {
      const id = String((row as { id: string }).id);
      const lat = Number((row as { map_lat?: number | null }).map_lat);
      const lng = Number((row as { map_lng?: number | null }).map_lng);
      if (validCoord(lat, lng)) byId.set(id, { lat, lng });
    }
  }

  const markers: BusinessMapMarker[] = [];
  for (const town of towns) {
    const fromDb = byId.get(town.id);
    const fromSeo = TOWN_GEO_COORDINATES[town.slug];
    const lat = fromDb?.lat ?? fromSeo?.latitude;
    const lng = fromDb?.lng ?? fromSeo?.longitude;
    if (lat == null || lng == null || !validCoord(lat, lng)) continue;
    const imageUrl =
      typeof town.hero_image_url === "string" && town.hero_image_url.startsWith("http")
        ? town.hero_image_url.trim()
        : null;
    markers.push({
      id: town.id,
      title: town.name,
      slug: town.slug,
      lat,
      lng,
      icon: "beach_access",
      href: townPagePath(town.slug),
      imageUrl,
      subtitle: "Town",
    });
  }

  return markers.sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Hub map pins for published areas with `map_lat` / `map_lng`.
 */
export async function listAreaHubMapMarkers(
  areas: { id: string; name: string; slug: string; hero_image_url?: string | null }[],
): Promise<BusinessMapMarker[]> {
  if (areas.length === 0) return [];

  const supabase = getServiceSupabase();
  const ids = areas.map((a) => a.id);
  const byId = new Map<string, { lat: number; lng: number }>();

  for (let i = 0; i < ids.length; i += 120) {
    const chunk = ids.slice(i, i + 120);
    const { data, error } = await supabase
      .from("areas")
      .select("id, map_lat, map_lng")
      .in("id", chunk);
    if (error) {
      console.error("area hub map markers:", error.message);
      break;
    }
    for (const row of data ?? []) {
      const id = String((row as { id: string }).id);
      const lat = Number((row as { map_lat?: number | null }).map_lat);
      const lng = Number((row as { map_lng?: number | null }).map_lng);
      if (validCoord(lat, lng)) byId.set(id, { lat, lng });
    }
  }

  const markers: BusinessMapMarker[] = [];
  for (const area of areas) {
    const coords = byId.get(area.id);
    if (!coords) continue;
    const imageUrl =
      typeof area.hero_image_url === "string" && area.hero_image_url.startsWith("http")
        ? area.hero_image_url.trim()
        : null;
    markers.push({
      id: area.id,
      title: area.name,
      slug: area.slug,
      lat: coords.lat,
      lng: coords.lng,
      icon: "storefront",
      href: `/area/${area.slug}`,
      imageUrl,
      subtitle: "Area",
    });
  }

  return markers.sort((a, b) => a.title.localeCompare(b.title));
}
