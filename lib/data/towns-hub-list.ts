import "server-only";

import { getServiceSupabase } from "@/lib/supabase/service-role";
import { getPublicImageUrlWithView } from "@/lib/media/public-image-url";
import { DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { isReservedRootSlug } from "@/lib/routes/reserved-slugs";
import { TOWNS_HUB_INCLUDE_OR_FILTER } from "@/lib/towns/towns-hub-visibility";

export type TownsHubListRow = {
  id: string;
  name: string;
  slug: string;
  hero_image_url: string | null;
  excerpt: string | null;
  content: string | null;
};

/** Published towns for /towns hub and home town grid (excludes include_on_towns_hub = false). */
export async function listTownsForTownsHub(): Promise<TownsHubListRow[]> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("towns_view")
    .select(
      "id, title, slug, excerpt, content, main_image, hero_image, main_image_url, hero_image_url, is_featured_destination, featured, sort, include_on_towns_hub",
    )
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(TOWNS_HUB_INCLUDE_OR_FILTER)
    .order("is_featured_destination", { ascending: false, nullsFirst: true })
    .order("featured", { ascending: false, nullsFirst: true })
    .order("sort", { ascending: true, nullsFirst: false })
    .order("title", { ascending: true });

  if (error) {
    if (error.message.includes("include_on_towns_hub")) {
      console.error(
        "listTownsForTownsHub: apply scripts/migrations/town-include-on-towns-hub.sql",
      );
    } else {
      console.error("listTownsForTownsHub", error);
    }
    return [];
  }

  return (data ?? [])
    .map((row) => {
      const r = row as Record<string, unknown>;
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
        hero_image_url: heroUrl,
        excerpt: (r.excerpt as string | null) ?? null,
        content: (r.content as string | null) ?? null,
      };
    })
    .filter((t) => t.slug && !isReservedRootSlug(t.slug));
}
