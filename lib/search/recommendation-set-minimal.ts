import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicImageUrlWithView } from "@/lib/media/public-image-url";
import {
  BROWSE_VISIBLE_NOT_HIDDEN,
  DIRECTUS_PUBLISHED_STATUS,
} from "@/lib/shop/public-listing-filters";
import type { BusinessPayload, SearchResultPayload } from "@/lib/search/types";
import type { SearchCandidateRankOrder } from "@/lib/scoring";

function sanitizeIlikeToken(raw: string): string {
  return raw.replace(/[%_,\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
}

function businessPayload(
  row: Record<string, unknown>,
  imageUrl: string | null,
): BusinessPayload {
  const displayName = String((row as { title?: string; name?: string }).title ?? row.name ?? "");
  const t = row.towns as { title?: string; slug?: string } | { title?: string; slug?: string }[] | null;
  const townOne = t && Array.isArray(t) ? t[0] : t;
  return {
    id: String(row.id),
    name: displayName,
    slug: row.slug != null ? String(row.slug) : undefined,
    address: (row.address as string | null) ?? null,
    town_id: null,
    town_name: townOne?.title ?? null,
    category_id: null,
    category_name: undefined,
    lat: row.map_lat != null ? Number(row.map_lat) : undefined,
    lng: row.map_lng != null ? Number(row.map_lng) : undefined,
    phone: (row.phone as string | null) ?? null,
    website: (row.website as string | null) ?? null,
    price_level: null,
    listing_rating: row.review_rating_cached != null ? Number(row.review_rating_cached) : null,
    listing_review_count: row.review_count_cached != null ? Number(row.review_count_cached) : null,
    tags: undefined,
    ai_summary: (row.excerpt as string | null) ?? (row.content as string | null)?.slice(0, 500) ?? null,
    image_url: imageUrl,
    hero_image_url: imageUrl,
    has_physical_location: row.map_lat != null && row.map_lng != null,
  };
}

/**
 * Simplified search over `businesses` (Directus-synced) without query_cache, scoring, or old joins.
 */
export async function buildMinimalSearchResult(
  supabase: SupabaseClient,
  options: {
    rawQuery: string;
    normalizedQuery: string;
    queryHash: string;
    model: string;
    openaiKey: string | undefined;
    page?: number;
    pageSize?: number;
    constrainTownId?: string;
    /** `areas.id`: `businesses.area_id` or `area_businesses` for this area. */
    constrainAreaId?: string;
    requiredHasPhysicalLocation?: boolean;
    sortMode?: SearchCandidateRankOrder;
    /** When set, filter `businesses.primary_category_id`. */
    primaryCategoryId?: string | null;
    /**
     * `?type=businesses` (or services) with no `q` used to pass a long placeholder string as one
     * ilike pattern — it matched nothing. When true, list visible non-archived rows without a text match.
     */
    skipIlikeTextFilter?: boolean;
    /**
     * Focused search term derived from intent attributes or a de-noised query, replacing
     * the raw query for the ilike so NL phrases like "restaurants near Seaside" don't get
     * matched verbatim against listing text.
     */
    searchTermOverride?: string;
  },
): Promise<SearchResultPayload> {
  const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 12));
  const page = Math.max(1, options.page ?? 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const ilikeSource = options.searchTermOverride ?? options.rawQuery;
  const searchToken = sanitizeIlikeToken(ilikeSource) || sanitizeIlikeToken(options.normalizedQuery) || "";
  const q = searchToken || "a";

  const FTS_ENABLED = process.env.FTS_SEARCH_ENABLED === "true";

  let query = supabase
    .from("businesses_view")
    .select(
      `id, town_id, slug, title, address, phone, website, content, excerpt, map_lat, map_lng, review_rating_cached, review_count_cached, main_image, hero_image, main_image_url, hero_image_url, status, featured, date_updated, business_categories ( title, slug ), towns ( title, slug )`,
      { count: "exact" },
    )
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN);

  if (!options.skipIlikeTextFilter) {
    if (FTS_ENABLED && searchToken) {
      query = query.textSearch("search_vector", searchToken, {
        type: "websearch",
        config: "english",
      });
    } else {
      query = query.or(
        `title.ilike.%${q}%,excerpt.ilike.%${q}%,search_keywords.ilike.%${q}%,content.ilike.%${q}%`,
      );
    }
  }

  if (options.constrainTownId) {
    query = query.eq("town_id", options.constrainTownId);
  }

  if (options.constrainAreaId) {
    const { data: linkRows } = await supabase
      .from("area_businesses")
      .select("business_id")
      .eq("area_id", options.constrainAreaId);
    const linkIds = (linkRows ?? [])
      .map((r) => (r as { business_id: string }).business_id)
      .filter(Boolean)
      .slice(0, 500);
    if (linkIds.length > 0) {
      query = query.or(`area_id.eq.${options.constrainAreaId},id.in.(${linkIds.join(",")})`);
    } else {
      query = query.eq("area_id", options.constrainAreaId);
    }
  }

  if (options.primaryCategoryId) {
    query = query.eq("primary_category_id", options.primaryCategoryId);
  }

  if (options.requiredHasPhysicalLocation === true) {
    query = query.not("map_lat", "is", null).not("map_lng", "is", null);
  }

  if (options.sortMode === "updated") {
    query = query.order("date_updated", { ascending: false, nullsFirst: false });
  } else if (options.sortMode === "name") {
    query = query.order("title", { ascending: true });
  } else {
    query = query
      .order("featured", { ascending: false, nullsFirst: true })
      .order("review_rating_cached", { ascending: false, nullsFirst: true })
      .order("review_count_cached", { ascending: false, nullsFirst: true })
      .order("title", { ascending: true });
  }

  const { data: rows, error, count } = await query.range(from, to);

  if (error) {
    console.error("buildMinimalSearchResult", error);
  }

  const list = (rows ?? []) as Record<string, unknown>[];
  const recs: SearchResultPayload["recommendations"] = list.map((row, i) => {
    const r = row as {
      main_image?: string | null;
      hero_image?: string | null;
      main_image_url?: string | null;
      hero_image_url?: string | null;
    };
    const img = getPublicImageUrlWithView(
      r.main_image_url,
      r.hero_image_url,
      r.main_image,
      r.hero_image,
    );
    const categories = row.business_categories as { title?: string; slug?: string } | null;
    const bp = businessPayload(row, img);
    if (categories?.title) bp.category_name = categories.title;
    return {
      business_id: String(row.id),
      rank: from + i + 1,
      headline: String((row as { title?: string }).title ?? "Listing"),
      explanation: (row.excerpt as string | null) ?? (row.excerpt as string) ?? "",
      highlighted_tags: [],
      business: bp,
    };
  });

  return {
    query: options.rawQuery,
    query_hash: options.queryHash,
    normalized_query: options.normalizedQuery,
    summary: `Found ${count ?? recs.length} local picks for “${options.rawQuery}”.`,
    total_results: count ?? recs.length,
    page,
    page_size: pageSize,
    recommendations: recs,
    suggestions: [],
    cached: false,
  };
}
