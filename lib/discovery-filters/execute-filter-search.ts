import "server-only";

import { getServiceSupabase } from "@/lib/supabase/service-role";
import { getPublicImageUrlWithView } from "@/lib/media/public-image-url";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { validateFilterContract } from "@/lib/discovery-filters/filter-contract";
import { discoverTownFilterApplies } from "@/lib/discovery-filters/discover-town-filter";
import type { DiscoveryFilterState } from "@/lib/discovery-filters/filter-state";
import {
  normalizeServiceCategoryGroupSlug,
  normalizeStorefrontCategoryGroupSlug,
} from "@/lib/discovery-filters/resolve-category-groups";
import {
  compareDiscoverListingScore,
  scoreDiscoverListing,
  type DiscoverListingScore,
} from "@/lib/discovery-filters/score-listing";
import { normalizeSearchTags } from "@/lib/discovery-filters/search-tag-aggregate";
import type {
  DiscoverFilterSearchResult,
  DiscoverListingRow,
  DiscoverTagMatch,
} from "@/lib/discovery-filters/types";
import { buildDiscoverTextOrClause } from "@/lib/discovery-filters/build-discover-text-or-clause";
import { trackDiscoverLowResults } from "@/lib/discovery-filters/track-discover-low-results";

const DISCOVER_POOL_LIMIT = 2000;

const VIEW_LISTING_SELECT =
  "id, slug, title, excerpt, business_type, main_image, hero_image, main_image_url, hero_image_url, search_keywords, search_tags, town_id, featured, is_storefront, is_service_business, map_lat, map_lng, business_categories ( slug ), service_categories ( slug ), towns ( title, slug )";

type PoolRow = Record<string, unknown>;

type ScoredPoolRow = { row: PoolRow; result: DiscoverListingScore };

function emptyResult(
  state: DiscoveryFilterState,
  applied: Record<string, unknown>,
): DiscoverFilterSearchResult {
  return {
    listings: [],
    total: 0,
    page: state.page,
    page_size: state.page_size,
    total_pages: 0,
    applied_filters: applied,
  };
}

function toTagMatch(result: DiscoverListingScore): DiscoverTagMatch {
  return {
    matched: result.tag_match.matched,
    missing: result.tag_match.missing,
  };
}

function mapListingRow(row: PoolRow, result?: DiscoverListingScore): DiscoverListingRow {
  const town = row.towns as { title?: string; slug?: string } | null;
  const cat = row.business_categories as { slug?: string } | null;
  const svc = row.service_categories as { slug?: string } | null;
  const heroUrl = getPublicImageUrlWithView(
    row.main_image_url as string | null,
    row.hero_image_url as string | null,
    row.main_image as string | null,
    row.hero_image as string | null,
  );
  const listing: DiscoverListingRow = {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    excerpt: (row.excerpt as string | null) ?? null,
    hero_image_url: heroUrl,
    town_name: town?.title ?? null,
    town_slug: town?.slug ?? null,
    category_slug: cat?.slug ?? null,
    service_category_slug: svc?.slug ?? null,
    business_type: (row.business_type as string | null) ?? null,
    search_tags: normalizeSearchTags(row.search_tags),
    map_lat:
      typeof row.map_lat === "number" && Number.isFinite(row.map_lat) ? row.map_lat : null,
    map_lng:
      typeof row.map_lng === "number" && Number.isFinite(row.map_lng) ? row.map_lng : null,
  };
  if (result) {
    listing.tag_match = toTagMatch(result);
    listing.scope_match = result.scope_match;
  }
  return listing;
}

function scorePoolRows(
  pool: PoolRow[],
  state: DiscoveryFilterState,
  storefrontGroup: string | undefined,
  serviceGroup: string | undefined,
): ScoredPoolRow[] {
  return pool.map((row) => ({
    row,
    result: scoreDiscoverListing(row, state, storefrontGroup, serviceGroup),
  }));
}

function paginateScored(
  rows: ScoredPoolRow[],
  page: number,
  pageSize: number,
): { pageRows: ScoredPoolRow[]; total: number; totalPages: number } {
  const total = rows.length;
  const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;
  const from = (page - 1) * pageSize;
  return {
    pageRows: rows.slice(from, from + pageSize),
    total,
    totalPages,
  };
}

function sortScoredRows(rows: ScoredPoolRow[]): ScoredPoolRow[] {
  return [...rows].sort((a, b) => {
    const scoreCmp = compareDiscoverListingScore(a.result, b.result);
    if (scoreCmp !== 0) return scoreCmp;
    const featuredA = Boolean(a.row.featured);
    const featuredB = Boolean(b.row.featured);
    if (featuredA !== featuredB) return featuredA ? -1 : 1;
    return String(a.row.title ?? "").localeCompare(String(b.row.title ?? ""), undefined, {
      sensitivity: "base",
    });
  });
}

function emitDiscoverLowResultsTelemetry(
  state: DiscoveryFilterState,
  result: DiscoverFilterSearchResult,
): void {
  void trackDiscoverLowResults({ state, result }).catch((err) => {
    console.error("trackDiscoverLowResults", err);
  });
}

export async function executeFilterSearch(
  state: DiscoveryFilterState,
): Promise<DiscoverFilterSearchResult> {
  const violations = validateFilterContract(state);
  if (violations.length) {
    return emptyResult(state, { ...state, contract_errors: violations });
  }

  const supabase = getServiceSupabase();
  const storefrontGroup = normalizeStorefrontCategoryGroupSlug(state.category_slug);
  const serviceGroup = normalizeServiceCategoryGroupSlug(state.service_category_slug);
  const hasTags = state.tags.length > 0;
  const needsAnchorSort = state.anchor_town_ids.length > 0;
  const needsMemoryPass =
    hasTags || Boolean(storefrontGroup || serviceGroup) || needsAnchorSort;

  let query = supabase
    .from("businesses_view")
    .select(VIEW_LISTING_SELECT, {
      count: needsMemoryPass ? undefined : "exact",
    })
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN);

  const useBbox = state.entity_type === "storefront" && Boolean(state.bbox);
  const townFilterApplies =
    !useBbox &&
    discoverTownFilterApplies(state.entity_type) &&
    state.town_ids.length > 0;

  if (hasTags) {
    if (townFilterApplies) {
      // Services are corridor-wide; town only constrains storefronts.
      const townList = state.town_ids.join(",");
      query = query.or(
        `is_service_business.eq.true,and(is_storefront.eq.true,town_id.in.(${townList}))`,
      );
    } else {
      query = query.or("is_storefront.eq.true,is_service_business.eq.true");
    }
  } else if (state.entity_type === "service") {
    query = query.eq("is_service_business", true);
  } else {
    query = query.eq("is_storefront", true);
    if (townFilterApplies) {
      query = query.in("town_id", state.town_ids);
    }
  }

  if (useBbox && state.bbox) {
    query = query
      .not("map_lat", "is", null)
      .not("map_lng", "is", null)
      .gte("map_lat", state.bbox.south)
      .lte("map_lat", state.bbox.north)
      .gte("map_lng", state.bbox.west)
      .lte("map_lng", state.bbox.east);
  }

  const q = state.q?.trim();
  if (q) {
    const orClause = buildDiscoverTextOrClause(q);
    if (orClause) {
      query = query.or(orClause);
    }
  }

  const appliedBase = {
    entity_type: state.entity_type,
    town_ids: useBbox ? [] : state.town_ids,
    anchor_town_ids: useBbox ? [] : state.anchor_town_ids,
    category_slug: state.category_slug ?? null,
    service_category_slug: state.service_category_slug ?? null,
    tags: state.tags,
    q: state.q ?? null,
    bbox: state.bbox ?? null,
    zoom: state.zoom ?? null,
    filter_mode: hasTags ? "tags_hard" : "scope_hard",
  };

  if (!needsMemoryPass) {
    const from = (state.page - 1) * state.page_size;
    const to = from + state.page_size - 1;

    const { data, error, count } = await query
      .order("featured", { ascending: false })
      .order("title", { ascending: true })
      .range(from, to);

    if (error) {
      console.error("executeFilterSearch", error);
      return emptyResult(state, { ...appliedBase, error: error.message });
    }

    const rows = (data ?? []) as PoolRow[];
    const total = count ?? 0;
    const total_pages = total > 0 ? Math.ceil(total / state.page_size) : 0;

    const searchResult = {
      listings: rows.map((row) => mapListingRow(row)),
      total,
      page: state.page,
      page_size: state.page_size,
      total_pages,
      applied_filters: appliedBase,
    };
    emitDiscoverLowResultsTelemetry(state, searchResult);
    return searchResult;
  }

  const { data, error } = await query
    .order("featured", { ascending: false })
    .order("title", { ascending: true })
    .limit(DISCOVER_POOL_LIMIT);

  if (error) {
    console.error("executeFilterSearch pool", error);
    return emptyResult(state, { ...appliedBase, error: error.message });
  }

  const pool = (data ?? []) as PoolRow[];

  if (!hasTags && !storefrontGroup && !serviceGroup) {
    const scored = sortScoredRows(scorePoolRows(pool, state, storefrontGroup, serviceGroup));
    const { pageRows, total, totalPages } = paginateScored(scored, state.page, state.page_size);

    const searchResult = {
      listings: pageRows.map(({ row, result }) => mapListingRow(row, result)),
      total,
      page: state.page,
      page_size: state.page_size,
      total_pages: totalPages,
      applied_filters: {
        ...appliedBase,
        pool_limit: DISCOVER_POOL_LIMIT,
      },
    };
    emitDiscoverLowResultsTelemetry(state, searchResult);
    return searchResult;
  }

  const scored = sortScoredRows(scorePoolRows(pool, state, storefrontGroup, serviceGroup)).filter(
    (s) => s.result.passes,
  );
  const resultPage = paginateScored(scored, state.page, state.page_size);

  const searchResult = {
    listings: resultPage.pageRows.map(({ row, result }) => mapListingRow(row, result)),
    total: resultPage.total,
    page: state.page,
    page_size: state.page_size,
    total_pages: resultPage.totalPages,
    applied_filters: {
      ...appliedBase,
      pool_limit: DISCOVER_POOL_LIMIT,
      storefront_group: storefrontGroup ?? null,
      service_group: serviceGroup ?? null,
    },
  };
  emitDiscoverLowResultsTelemetry(state, searchResult);
  return searchResult;
}
