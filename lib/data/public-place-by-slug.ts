import "server-only";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { getPublicImageUrl } from "@/lib/media/public-image-url";
import { BROWSE_VISIBLE_NOT_HIDDEN } from "@/lib/shop/public-listing-filters";
import { normalizeUrlSegment } from "@/lib/routes/url-slug";

/**
 * A browsable "place" for `/area/[slug]`: an `areas` row and/or a `points_of_interest` row
 * (search UIs use the same `/area/...` path for both).
 */
export type PublicPlacePage = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  areaTypeLabel: string | null;
  town_id: string | null;
  town_name: string | null;
  town_slug: string | null;
  hero_image_url: string | null;
};

/**
 * Resolves a public place for `/area/[slug]`: tries `areas` first, then `points_of_interest`.
 */
export async function getPublicPlaceBySlug(
  slug: string,
): Promise<PublicPlacePage | null> {
  const key = normalizeUrlSegment(slug);
  if (!key) return null;

  const supabase = getServiceSupabase();

  const { data: areaRows, error: areaErr } = await supabase
    .from("areas")
    .select("id, title, slug, excerpt, content, main_image, hero_image, area_type, town_id, towns(title, slug)")
    .eq("slug", key)
    .is("archived_at", null)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .limit(1);

  const area = areaRows?.[0];

  if (areaErr) {
    // eslint-disable-next-line no-console
    console.error("getPublicPlaceBySlug areas", { slug: key, areaErr });
  } else if (area) {
    const a = area as Record<string, unknown>;
    const rawT = a.towns as
      | { title: string; slug: string }
      | { title: string; slug: string }[]
      | null
      | undefined;
    const to = Array.isArray(rawT) ? rawT[0] : rawT;
    return {
      id: String(a.id),
      title: String(a.title),
      slug: String(a.slug),
      excerpt: (a.excerpt as string | null) ?? null,
      content: (a.content as string | null) ?? null,
      areaTypeLabel: (a.area_type as string | null) ?? null,
      town_id: (a.town_id as string | null) ?? null,
      town_name: to?.title ?? null,
      town_slug: to?.slug ?? null,
      hero_image_url:
        getPublicImageUrl(a.main_image as string | null) ?? getPublicImageUrl(a.hero_image as string | null),
    };
  }

  const { data: poiRows, error: poiErr } = await supabase
    .from("points_of_interest")
    .select("id, title, slug, excerpt, content, main_image, hero_image, poi_type, town_id, towns(title, slug)")
    .eq("slug", key)
    .is("archived_at", null)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .limit(1);

  if (poiErr) {
    // eslint-disable-next-line no-console
    console.error("getPublicPlaceBySlug points_of_interest", { slug: key, poiErr });
    return null;
  }
  const poi = poiRows?.[0] ?? null;
  if (!poi) return null;

  const p = poi as Record<string, unknown>;
  const rawT = p.towns as
    | { title: string; slug: string }
    | { title: string; slug: string }[]
    | null
    | undefined;
  const to = Array.isArray(rawT) ? rawT[0] : rawT;
  return {
    id: String(p.id),
    title: String(p.title),
    slug: String(p.slug),
    excerpt: (p.excerpt as string | null) ?? null,
    content: (p.content as string | null) ?? null,
    areaTypeLabel: (p.poi_type as string | null) ?? null,
    town_id: (p.town_id as string | null) ?? null,
    town_name: to?.title ?? null,
    town_slug: to?.slug ?? null,
    hero_image_url:
      getPublicImageUrl(p.main_image as string | null) ?? getPublicImageUrl(p.hero_image as string | null),
  };
}
