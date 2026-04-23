import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicImageUrl } from "@/lib/media/public-image-url";
import {
  BROWSE_VISIBLE_NOT_HIDDEN,
  storefrontListingStatuses,
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
  return {
    id: String(row.id),
    name: displayName,
    slug: row.slug != null ? String(row.slug) : undefined,
    address: (row.address as string | null) ?? null,
    town_id: null,
    town_name: null,
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
    requiredHasPhysicalLocation?: boolean;
    sortMode?: SearchCandidateRankOrder;
    /** When set, filter `businesses.primary_category_id`. */
    primaryCategoryId?: string | null;
  },
): Promise<SearchResultPayload> {
  const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 12));
  const page = Math.max(1, options.page ?? 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const q = sanitizeIlikeToken(options.rawQuery) || sanitizeIlikeToken(options.normalizedQuery) || "a";

  let query = supabase
    .from("businesses")
    .select(
      `id, slug, title, address, phone, website, content, excerpt, map_lat, map_lng, review_rating_cached, review_count_cached, main_image, hero_image, status, business_categories ( name, slug )`,
      { count: "exact" },
    )
    .in("status", storefrontListingStatuses())
    .is("archived_at", null)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .or(`title.ilike.%${q}%,excerpt.ilike.%${q}%,search_keywords.ilike.%${q}%`);

  if (options.constrainTownId) {
    query = query.eq("town_id", options.constrainTownId);
  }

  if (options.primaryCategoryId) {
    query = query.eq("primary_category_id", options.primaryCategoryId);
  }

  if (options.requiredHasPhysicalLocation === true) {
    query = query.not("map_lat", "is", null).not("map_lng", "is", null);
  }

  if (options.sortMode === "updated") {
    query = query.order("date_updated", { ascending: false, nullsFirst: false });
  } else {
    query = query.order("title", { ascending: true });
  }

  const { data: rows, error, count } = await query.range(from, to);

  if (error) {
    console.error("buildMinimalSearchResult", error);
  }

  const list = (rows ?? []) as Record<string, unknown>[];
  const recs: SearchResultPayload["recommendations"] = list.map((row, i) => {
    const img =
      getPublicImageUrl((row.main_image as string) ?? null) ??
      getPublicImageUrl((row.hero_image as string) ?? null);
    const categories = row.business_categories as { name?: string; slug?: string } | null;
    const bp = businessPayload(row, img);
    if (categories?.name) bp.category_name = categories.name;
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
