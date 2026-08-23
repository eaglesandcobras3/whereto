import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type RecentBusinessListItem = {
  id: string;
  title: string;
  slug: string;
  date_created: string;
  town_title: string | null;
  has_photo: boolean;
};

const DEFAULT_DAYS = 30;
const DEFAULT_LIMIT = 50;
const MAX_DAYS = 90;
const MAX_LIMIT = 100;

function businessHasPhoto(row: {
  main_image_url: string | null;
  hero_image_url: string | null;
  main_image: string | null;
  hero_image: string | null;
}): boolean {
  return Boolean(
    row.main_image_url?.trim() ||
      row.hero_image_url?.trim() ||
      row.main_image?.trim() ||
      row.hero_image?.trim(),
  );
}

/** Businesses created within the last N days — for admin photo follow-up. */
export async function listRecentBusinessesForAdmin(
  supabase: SupabaseClient,
  options?: { days?: number; limit?: number },
): Promise<RecentBusinessListItem[]> {
  const days = Math.min(Math.max(options?.days ?? DEFAULT_DAYS, 1), MAX_DAYS);
  const limit = Math.min(Math.max(options?.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("businesses")
    .select(
      "id, title, slug, date_created, main_image_url, hero_image_url, main_image, hero_image, towns ( title )",
    )
    .is("archived_at", null)
    .gte("date_created", since)
    .order("date_created", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row) => {
    const townRel = row.towns as { title?: string } | { title?: string }[] | null;
    const town = Array.isArray(townRel) ? townRel[0] : townRel;
    const typed = row as {
      id: string;
      title: string | null;
      slug: string;
      date_created: string;
      main_image_url: string | null;
      hero_image_url: string | null;
      main_image: string | null;
      hero_image: string | null;
    };
    return {
      id: String(typed.id),
      title: String(typed.title ?? "").trim() || typed.slug,
      slug: String(typed.slug ?? ""),
      date_created: typed.date_created,
      town_title: town?.title ? String(town.title) : null,
      has_photo: businessHasPhoto(typed),
    };
  });
}
