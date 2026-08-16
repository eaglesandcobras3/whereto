import "server-only";

import { leafCategoryIcon } from "@/lib/categories/unified-browse";
import type { PublicPlacePage } from "@/lib/data/public-place-by-slug";
import { businessListingImageUrl } from "@/lib/media/place-photo";
import { getPublicImageUrlWithView } from "@/lib/media/public-image-url";
import {
  DIRECTUS_PUBLISHED_STATUS,
} from "@/lib/shop/public-listing-filters";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export type BusinessMapMarker = {
  id: string;
  title: string;
  slug: string;
  lat: number;
  lng: number;
  /** Material Symbols name for category-styled pins (optional). */
  icon?: string | null;
  /** Popup link path; defaults to `/business/{slug}`. */
  href?: string | null;
  /** Resolved public listing thumbnail for map popups. */
  imageUrl?: string | null;
  /** Optional one-line secondary text under the title. */
  subtitle?: string | null;
};

const MARKER_SELECT =
  "id, title, slug, map_lat, map_lng, main_image, hero_image, main_image_url, hero_image_url, business_categories ( slug, title )";
const MARKER_CAP = 500;

function categoryFromRow(row: Record<string, unknown>): {
  slug: string | null;
  title: string | null;
} {
  const embed = row.business_categories as
    | { slug?: string | null; title?: string | null }
    | { slug?: string | null; title?: string | null }[]
    | null
    | undefined;
  const one = embed && Array.isArray(embed) ? embed[0] : embed;
  const slug = typeof one?.slug === "string" ? one.slug.trim() : "";
  const title = typeof one?.title === "string" ? one.title.trim() : "";
  return { slug: slug || null, title: title || null };
}

function rowsToMarkers(
  rows: Record<string, unknown>[],
  opts?: { defaultIcon?: string | null },
): BusinessMapMarker[] {
  const byId = new Map<string, BusinessMapMarker>();
  for (const row of rows) {
    const lat = Number(row.map_lat);
    const lng = Number(row.map_lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;
    const id = String(row.id);
    if (!id || byId.has(id)) continue;
    const slug = String(row.slug ?? "").trim();
    const title = String(row.title ?? "").trim();
    if (!slug || !title) continue;
    const cat = categoryFromRow(row);
    const icon =
      (cat.slug ? leafCategoryIcon(cat.slug) : null) ||
      opts?.defaultIcon?.trim() ||
      "storefront";
    const imageUrl = businessListingImageUrl(
      getPublicImageUrlWithView(
        row.main_image_url as string | null,
        row.hero_image_url as string | null,
        row.main_image as string | null,
        row.hero_image as string | null,
      ),
    );
    byId.set(id, {
      id,
      title,
      slug,
      lat,
      lng,
      icon,
      imageUrl,
      subtitle: cat.title,
    });
  }
  return [...byId.values()].sort((a, b) => a.title.localeCompare(b.title));
}

function storefrontBrowseQuery() {
  const supabase = getServiceSupabase();
  return supabase
    .from("businesses_view")
    .select(MARKER_SELECT)
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .eq("is_storefront", true)
    .eq("is_explorable", true)
    .not("map_lat", "is", null)
    .not("map_lng", "is", null);
}

/** Storefront businesses with coordinates in a town (and its linked areas). */
export async function listStorefrontMapMarkersForTown(
  townId: string,
): Promise<BusinessMapMarker[]> {
  const supabase = getServiceSupabase();
  const { data: areas } = await supabase.from("areas").select("id").eq("town_id", townId);
  const areaIds = (areas ?? []).map((a) => String((a as { id: string }).id)).filter(Boolean);

  const queries = [
    storefrontBrowseQuery().eq("town_id", townId).limit(MARKER_CAP),
    ...(areaIds.length > 0
      ? [storefrontBrowseQuery().in("area_id", areaIds).limit(MARKER_CAP)]
      : []),
  ];

  const results = await Promise.all(queries);
  const rows: Record<string, unknown>[] = [];
  for (const res of results) {
    rows.push(...((res.data as Record<string, unknown>[] | null) ?? []));
  }

  if (areaIds.length > 0) {
    const { data: links } = await supabase
      .from("area_businesses")
      .select("business_id")
      .in("area_id", areaIds);
    const ids = [
      ...new Set(
        (links ?? [])
          .map((l) => String((l as { business_id: string }).business_id))
          .filter(Boolean),
      ),
    ];
    if (ids.length > 0) {
      for (let i = 0; i < ids.length; i += 120) {
        const chunk = ids.slice(i, i + 120);
        const { data } = await storefrontBrowseQuery().in("id", chunk).limit(MARKER_CAP);
        rows.push(...((data as Record<string, unknown>[] | null) ?? []));
      }
    }
  }

  return rowsToMarkers(rows);
}

/** Storefront businesses with coordinates for an area / POI hub. */
export async function listStorefrontMapMarkersForPlace(
  place: PublicPlacePage,
): Promise<BusinessMapMarker[]> {
  const supabase = getServiceSupabase();
  const rows: Record<string, unknown>[] = [];

  if (place.source === "area") {
    const { data: byColumn } = await storefrontBrowseQuery()
      .eq("area_id", place.id)
      .limit(MARKER_CAP);
    rows.push(...((byColumn as Record<string, unknown>[] | null) ?? []));

    const { data: links } = await supabase
      .from("area_businesses")
      .select("business_id")
      .eq("area_id", place.id);
    const ids = (links ?? [])
      .map((l) => String((l as { business_id: string }).business_id))
      .filter(Boolean);
    if (ids.length > 0) {
      const { data: fromJoin } = await storefrontBrowseQuery().in("id", ids).limit(MARKER_CAP);
      rows.push(...((fromJoin as Record<string, unknown>[] | null) ?? []));
    }
  } else {
    if (place.parent_area_id && place.town_id) {
      const { data: wide } = await storefrontBrowseQuery()
        .or(`area_id.eq.${place.parent_area_id},town_id.eq.${place.town_id}`)
        .limit(MARKER_CAP);
      rows.push(...((wide as Record<string, unknown>[] | null) ?? []));
    } else if (place.parent_area_id) {
      const { data: byA } = await storefrontBrowseQuery()
        .eq("area_id", place.parent_area_id)
        .limit(MARKER_CAP);
      rows.push(...((byA as Record<string, unknown>[] | null) ?? []));
    } else if (place.town_id) {
      const { data: byT } = await storefrontBrowseQuery()
        .eq("town_id", place.town_id)
        .limit(MARKER_CAP);
      rows.push(...((byT as Record<string, unknown>[] | null) ?? []));
    }

    if (place.parent_area_id) {
      const { data: links } = await supabase
        .from("area_businesses")
        .select("business_id")
        .eq("area_id", place.parent_area_id);
      const ids = (links ?? [])
        .map((l) => String((l as { business_id: string }).business_id))
        .filter(Boolean);
      if (ids.length > 0) {
        const { data: fromJoin } = await storefrontBrowseQuery().in("id", ids).limit(MARKER_CAP);
        rows.push(...((fromJoin as Record<string, unknown>[] | null) ?? []));
      }
    }
  }

  return rowsToMarkers(rows);
}

/** Storefront map pins for a known set of business ids (e.g. category hub pool). */
export async function listStorefrontMapMarkersForBusinessIds(
  businessIds: string[],
  opts?: { defaultIcon?: string | null },
): Promise<BusinessMapMarker[]> {
  const ids = [...new Set(businessIds.filter(Boolean))];
  if (ids.length === 0) return [];

  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < ids.length; i += 120) {
    const chunk = ids.slice(i, i + 120);
    const { data } = await storefrontBrowseQuery().in("id", chunk).limit(MARKER_CAP);
    rows.push(...((data as Record<string, unknown>[] | null) ?? []));
  }
  return rowsToMarkers(rows, opts);
}
