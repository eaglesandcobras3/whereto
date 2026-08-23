import "server-only";

import { getServiceSupabase } from "@/lib/supabase/service-role";
import { getPublicImageUrlWithView } from "@/lib/media/public-image-url";
import { DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { AREAS_HUB_INCLUDE_OR_FILTER } from "@/lib/places/hub-browse-visibility";

const AREA_TYPE_LABELS: Record<string, string> = {
  shopping_district: "Shopping district",
  town_center: "Town center",
  neighborhood: "Neighborhood",
  landmark: "Landmark",
  waterfront: "Waterfront",
  market: "Market",
  shopping_area: "Shopping area",
  district: "District",
  square: "Square",
  development: "Development",
  point_of_interest: "Point of interest",
};

function areaSubtitle(
  excerpt: string | null,
  areaType: string | null,
  townName: string | null,
): string | null {
  if (excerpt?.trim()) return excerpt.trim();
  const typeLabel = areaType
    ? (AREA_TYPE_LABELS[areaType] ?? areaType.replace(/_/g, " "))
    : null;
  if (typeLabel && townName) return `${typeLabel} · ${townName}`;
  return typeLabel ?? townName;
}

export type AreasHubListRow = {
  id: string;
  name: string;
  slug: string;
  subtitle: string | null;
  hero_image_url: string | null;
};

const AREAS_HUB_SELECT =
  "id, title, slug, area_type, excerpt, main_image, hero_image, main_image_url, hero_image_url, towns ( title, slug )" as const;

/** Published areas for /areas hub (excludes include_in_site_browse = false). */
export async function listAreasForAreasHub(): Promise<AreasHubListRow[]> {
  const supabase = getServiceSupabase();
  let { data, error } = await supabase
    .from("areas_view")
    .select(`${AREAS_HUB_SELECT}, include_in_site_browse`)
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(AREAS_HUB_INCLUDE_OR_FILTER)
    .order("title");

  if (error?.message.includes("include_in_site_browse")) {
    console.warn(
      "listAreasForAreasHub: include_in_site_browse missing — apply scripts/migrations/area-include-in-site-browse.sql; listing all published areas",
    );
    ({ data, error } = await supabase
      .from("areas_view")
      .select(AREAS_HUB_SELECT)
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .order("title"));
  }

  if (error) {
    console.error("listAreasForAreasHub", error);
    return [];
  }

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const town = r.towns as { title?: string } | null;
    const heroUrl = getPublicImageUrlWithView(
      r.main_image_url as string | null,
      r.hero_image_url as string | null,
      r.main_image as string | null,
      r.hero_image as string | null,
    );
    return {
      id: String(r.id),
      name: String((r as { title: string }).title),
      slug: String(r.slug),
      subtitle: areaSubtitle(
        (r.excerpt as string | null) ?? null,
        (r.area_type as string | null) ?? null,
        town?.title ?? null,
      ),
      hero_image_url: heroUrl,
    };
  });
}
