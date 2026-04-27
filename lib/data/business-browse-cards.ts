import "server-only";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { getPublicImageUrlWithView } from "@/lib/media/public-image-url";
import { BROWSE_VISIBLE_NOT_HIDDEN } from "@/lib/shop/public-listing-filters";
import type { PublicPlacePage } from "@/lib/data/public-place-by-slug";

const BROWSE_SELECT =
  "id, title, slug, excerpt, main_image, hero_image, main_image_url, hero_image_url, date_updated";

export type BrowseBusinessCard = {
  id: string;
  name: string;
  slug: string;
  hero_image_url: string | null;
  ai_one_liner: string | null;
  ai_summary: string | null;
};

function mapRow(r: Record<string, unknown>): BrowseBusinessCard {
  const row = r as {
    main_image?: string | null;
    hero_image?: string | null;
    main_image_url?: string | null;
    hero_image_url?: string | null;
    title?: string;
  };
  const u = getPublicImageUrlWithView(
    row.main_image_url,
    row.hero_image_url,
    row.main_image,
    row.hero_image,
  );
  const excerpt = (r as { excerpt?: string | null }).excerpt ?? null;
  return {
    id: String(r.id),
    name: String((r as { title: string }).title),
    slug: String(r.slug),
    hero_image_url: u,
    ai_one_liner: excerpt,
    ai_summary: excerpt,
  };
}

type BrowseQuery = {
  supabase: ReturnType<typeof getServiceSupabase>;
  excludeId?: string;
};

function baseBrowseListQuery({ supabase, excludeId }: BrowseQuery) {
  let q = supabase
    .from("businesses_view")
    .select(BROWSE_SELECT)
    .is("archived_at", null)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .order("date_updated", { ascending: false, nullsFirst: false });
  if (excludeId) q = q.neq("id", excludeId);
  return q;
}

export async function getBrowseBusinessesForTown(
  townId: string,
  limit: number,
  excludeId?: string,
): Promise<BrowseBusinessCard[]> {
  const supabase = getServiceSupabase();
  const { data } = await baseBrowseListQuery({ supabase, excludeId })
    .eq("town_id", townId)
    .limit(limit);
  return (data as Record<string, unknown>[] | null)?.map((r) => mapRow(r)) ?? [];
}

function dedupeById(
  rows: Record<string, unknown>[],
  seen: Set<string>,
  out: Record<string, unknown>[],
) {
  for (const r of rows) {
    const id = String(r.id);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(r);
  }
}

/** Area hub + `area_businesses` join; for POI, parent `area` and/or `town` per place rules. */
export async function getBrowseBusinessesForPublicPlace(
  place: PublicPlacePage,
  limit: number,
): Promise<BrowseBusinessCard[]> {
  const supabase = getServiceSupabase();
  const seen = new Set<string>();
  const combined: Record<string, unknown>[] = [];

  const cap = Math.max(limit * 2, 24);

  if (place.source === "area") {
    const { data: byColumn } = await baseBrowseListQuery({ supabase })
      .eq("area_id", place.id)
      .limit(cap);
    dedupeById((byColumn as Record<string, unknown>[]) ?? [], seen, combined);

    const { data: links } = await supabase
      .from("area_businesses")
      .select("business_id")
      .eq("area_id", place.id);
    const ids = (links ?? [])
      .map((l) => (l as { business_id: string }).business_id)
      .filter(Boolean);
    if (ids.length > 0) {
      const { data: fromJoin } = await baseBrowseListQuery({ supabase })
        .in("id", ids)
        .limit(cap);
      dedupeById((fromJoin as Record<string, unknown>[]) ?? [], seen, combined);
    }
  } else {
    if (place.parent_area_id && place.town_id) {
      const { data: wide } = await baseBrowseListQuery({ supabase })
        .or(`area_id.eq.${place.parent_area_id},town_id.eq.${place.town_id}`)
        .limit(limit * 2);
      dedupeById((wide as Record<string, unknown>[]) ?? [], seen, combined);
    } else if (place.parent_area_id) {
      const { data: byA } = await baseBrowseListQuery({ supabase })
        .eq("area_id", place.parent_area_id)
        .limit(limit);
      dedupeById((byA as Record<string, unknown>[]) ?? [], seen, combined);
    } else if (place.town_id) {
      const { data: byT } = await baseBrowseListQuery({ supabase })
        .eq("town_id", place.town_id)
        .limit(limit);
      dedupeById((byT as Record<string, unknown>[]) ?? [], seen, combined);
    }
  }

  combined.sort((a, b) => {
    const da = (a as { date_updated?: string | null }).date_updated;
    const db = (b as { date_updated?: string | null }).date_updated;
    if (!da && !db) return 0;
    if (!db) return -1;
    if (!da) return 1;
    return db.localeCompare(da);
  });
  return combined.slice(0, limit).map((r) => mapRow(r));
}

export async function getSimilarBusinesses(options: {
  businessId: string;
  townId: string | null;
  primaryCategoryId: string | null;
  limit: number;
}): Promise<BrowseBusinessCard[]> {
  const { businessId, townId, primaryCategoryId, limit } = options;
  const supabase = getServiceSupabase();
  const out: BrowseBusinessCard[] = [];
  const seen = new Set<string>([businessId]);

  if (townId && primaryCategoryId) {
    const { data: same } = await baseBrowseListQuery({ supabase, excludeId: businessId })
      .eq("town_id", townId)
      .eq("primary_category_id", primaryCategoryId)
      .limit(limit);
    for (const r of (same as Record<string, unknown>[]) ?? []) {
      if (out.length >= limit) break;
      if (seen.has(String(r.id))) continue;
      seen.add(String(r.id));
      out.push(mapRow(r));
    }
  }

  if (out.length < limit && townId) {
    const { data: fill } = await baseBrowseListQuery({ supabase, excludeId: businessId })
      .eq("town_id", townId)
      .limit(limit * 2);
    for (const r of (fill as Record<string, unknown>[]) ?? []) {
      if (out.length >= limit) break;
      if (seen.has(String(r.id))) continue;
      seen.add(String(r.id));
      out.push(mapRow(r));
    }
  }

  return out;
}
