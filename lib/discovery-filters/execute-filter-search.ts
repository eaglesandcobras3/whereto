import "server-only";

import { getServiceSupabase } from "@/lib/supabase/service-role";
import { getPublicImageUrlWithView } from "@/lib/media/public-image-url";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { businessCategoryGroupForSlug } from "@/lib/business-categories/groups";
import { serviceCategoryGroupForSlug } from "@/lib/service-categories/groups";
import type { ServiceCategorySlug } from "@/lib/service-categories/constants";
import { validateFilterContract } from "@/lib/discovery-filters/filter-contract";
import type { DiscoveryFilterState } from "@/lib/discovery-filters/filter-state";
import {
  normalizeServiceCategoryGroupSlug,
  normalizeStorefrontCategoryGroupSlug,
} from "@/lib/discovery-filters/resolve-category-groups";
import {
  analyzeTagMatch,
  compareTagMatchScore,
  type TagMatchAnalysis,
} from "@/lib/discovery-filters/tag-match";
import { normalizeSearchTags } from "@/lib/discovery-filters/search-tag-aggregate";
import type {
  DiscoverFilterSearchResult,
  DiscoverListingRow,
  DiscoverTagMatch,
} from "@/lib/discovery-filters/types";

const DISCOVER_POOL_LIMIT = 2000;

const VIEW_LISTING_SELECT =
  "id, slug, title, excerpt, business_type, main_image, hero_image, main_image_url, hero_image_url, search_keywords, search_tags, town_id, featured, business_categories ( slug ), service_categories ( slug ), towns ( title, slug )";

type PoolRow = Record<string, unknown>;

type ScoredPoolRow = { row: PoolRow; analysis: TagMatchAnalysis };

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

function toTagMatch(analysis: TagMatchAnalysis): DiscoverTagMatch {
  return {
    matched: analysis.matched,
    missing: analysis.missing,
  };
}

function mapListingRow(row: PoolRow, analysis?: TagMatchAnalysis): DiscoverListingRow {
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
  };
  if (analysis) {
    listing.tag_match = toTagMatch(analysis);
  }
  return listing;
}

function matchesStorefrontGroup(row: PoolRow, groupSlug: string): boolean {
  const cat = row.business_categories as { slug?: string } | null;
  return businessCategoryGroupForSlug(cat?.slug ?? null) === groupSlug;
}

function matchesServiceGroup(row: PoolRow, groupSlug: string): boolean {
  const svc = row.service_categories as { slug?: string } | null;
  const slug = svc?.slug?.trim().toLowerCase();
  if (!slug) return false;
  return serviceCategoryGroupForSlug(slug as ServiceCategorySlug) === groupSlug;
}

function sortPoolRows(rows: PoolRow[]): PoolRow[] {
  return [...rows].sort((a, b) => {
    const featuredA = Boolean(a.featured);
    const featuredB = Boolean(b.featured);
    if (featuredA !== featuredB) return featuredA ? -1 : 1;
    return String(a.title ?? "").localeCompare(String(b.title ?? ""), undefined, {
      sensitivity: "base",
    });
  });
}

function applyBrowsePoolFilters(
  rows: PoolRow[],
  storefrontGroup: string | undefined,
  serviceGroup: string | undefined,
  entityType: DiscoveryFilterState["entity_type"],
): PoolRow[] {
  let filtered = rows;

  if (entityType === "storefront" && storefrontGroup) {
    filtered = filtered.filter((row) => matchesStorefrontGroup(row, storefrontGroup));
  }

  if (entityType === "service" && serviceGroup) {
    filtered = filtered.filter((row) => matchesServiceGroup(row, serviceGroup));
  }

  return filtered;
}

function scorePoolRows(pool: PoolRow[], state: DiscoveryFilterState): ScoredPoolRow[] {
  return pool.map((row) => ({
    row,
    analysis: analyzeTagMatch(normalizeSearchTags(row.search_tags), state.tags),
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

function hasTagFilters(state: DiscoveryFilterState): boolean {
  return state.tags.length > 0;
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

  const needsMemoryPass = Boolean(
    storefrontGroup || serviceGroup || hasTagFilters(state),
  );

  let query = supabase
    .from("businesses_view")
    .select(VIEW_LISTING_SELECT, {
      count: needsMemoryPass ? undefined : "exact",
    })
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN);

  if (state.entity_type === "service") {
    query = query.eq("is_service_business", true);
  } else {
    query = query.eq("is_storefront", true);
  }

  if (state.town_ids.length) {
    query = query.in("town_id", state.town_ids);
  }

  const q = state.q?.trim();
  if (q) {
    const safe = q.replace(/[%_,\\]/g, " ").trim();
    if (safe) {
      query = query.or(
        `title.ilike.%${safe}%,slug.ilike.%${safe}%,search_keywords.ilike.%${safe}%,excerpt.ilike.%${safe}%`,
      );
    }
  }

  const appliedBase = {
    entity_type: state.entity_type,
    town_ids: state.town_ids,
    category_slug: state.category_slug ?? null,
    service_category_slug: state.service_category_slug ?? null,
    tags: state.tags,
    q: state.q ?? null,
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

    return {
      listings: rows.map((row) => mapListingRow(row)),
      total,
      page: state.page,
      page_size: state.page_size,
      total_pages,
      applied_filters: appliedBase,
    };
  }

  const { data, error } = await query
    .order("featured", { ascending: false })
    .order("title", { ascending: true })
    .limit(DISCOVER_POOL_LIMIT);

  if (error) {
    console.error("executeFilterSearch pool", error);
    return emptyResult(state, { ...appliedBase, error: error.message });
  }

  let pool = (data ?? []) as PoolRow[];
  pool = applyBrowsePoolFilters(pool, storefrontGroup, serviceGroup, state.entity_type);

  if (!hasTagFilters(state)) {
    pool = sortPoolRows(pool);
    const { pageRows, total, totalPages } = paginateScored(
      pool.map((row) => ({
        row,
        analysis: analyzeTagMatch(normalizeSearchTags(row.search_tags), []),
      })),
      state.page,
      state.page_size,
    );

    return {
      listings: pageRows.map(({ row }) => mapListingRow(row)),
      total,
      page: state.page,
      page_size: state.page_size,
      total_pages: totalPages,
      applied_filters: {
        ...appliedBase,
        pool_limit: DISCOVER_POOL_LIMIT,
        storefront_group: storefrontGroup ?? null,
        service_group: serviceGroup ?? null,
      },
    };
  }

  const scored = scorePoolRows(pool, state)
    .filter((s) => s.analysis.matches)
    .sort((a, b) => {
      const scoreCmp = compareTagMatchScore(a.analysis, b.analysis);
      if (scoreCmp !== 0) return scoreCmp;
      const featuredA = Boolean(a.row.featured);
      const featuredB = Boolean(b.row.featured);
      if (featuredA !== featuredB) return featuredA ? -1 : 1;
      return String(a.row.title ?? "").localeCompare(String(b.row.title ?? ""), undefined, {
        sensitivity: "base",
      });
    });

  const tagPage = paginateScored(scored, state.page, state.page_size);

  return {
    listings: tagPage.pageRows.map(({ row, analysis }) => mapListingRow(row, analysis)),
    total: tagPage.total,
    page: state.page,
    page_size: state.page_size,
    total_pages: tagPage.totalPages,
    applied_filters: {
      ...appliedBase,
      pool_limit: DISCOVER_POOL_LIMIT,
      storefront_group: storefrontGroup ?? null,
      service_group: serviceGroup ?? null,
    },
  };
}
