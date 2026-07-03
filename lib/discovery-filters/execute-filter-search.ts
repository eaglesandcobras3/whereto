import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { getPublicImageUrlWithView } from "@/lib/media/public-image-url";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { businessCategoryGroupForSlug } from "@/lib/business-categories/groups";
import { serviceCategoryGroupForSlug } from "@/lib/service-categories/groups";
import type { ServiceCategorySlug } from "@/lib/service-categories/constants";
import { rowMatchesSearchTags } from "@/lib/discovery-filters/compile-filter-query";
import { validateFilterContract } from "@/lib/discovery-filters/filter-contract";
import type { DiscoveryFilterState } from "@/lib/discovery-filters/filter-state";
import {
  normalizeServiceCategoryGroupSlug,
  normalizeStorefrontCategoryGroupSlug,
} from "@/lib/discovery-filters/resolve-category-groups";
import type { DiscoverFilterSearchResult, DiscoverListingRow } from "@/lib/discovery-filters/types";

const DISCOVER_POOL_LIMIT = 2000;
const TAG_FETCH_CHUNK = 120;

const VIEW_LISTING_SELECT =
  "id, slug, title, excerpt, business_type, main_image, hero_image, main_image_url, hero_image_url, search_keywords, search_tags, town_id, featured, business_categories ( slug ), service_categories ( slug ), towns ( title, slug )";

type PoolRow = Record<string, unknown>;

function normalizeSearchTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((t): t is string => typeof t === "string" && t.trim().length > 0);
}

function mapListingRow(row: PoolRow): DiscoverListingRow {
  const town = row.towns as { title?: string; slug?: string } | null;
  const cat = row.business_categories as { slug?: string } | null;
  const svc = row.service_categories as { slug?: string } | null;
  const heroUrl = getPublicImageUrlWithView(
    row.main_image_url as string | null,
    row.hero_image_url as string | null,
    row.main_image as string | null,
    row.hero_image as string | null,
  );
  return {
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
}

async function resolveTownId(
  supabase: SupabaseClient,
  townId?: string,
  townSlug?: string,
): Promise<string | undefined> {
  if (townId) return townId;
  if (!townSlug?.trim()) return undefined;
  const { data } = await supabase
    .from("towns")
    .select("id")
    .eq("slug", townSlug.trim())
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .maybeSingle();
  return data ? String((data as { id: string }).id) : undefined;
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

async function attachSearchTags(
  supabase: SupabaseClient,
  rows: PoolRow[],
): Promise<PoolRow[]> {
  const needsFetch = rows.filter((row) => normalizeSearchTags(row.search_tags).length === 0);
  if (!needsFetch.length) return rows;

  const tagById = new Map<string, string[]>();
  for (let i = 0; i < needsFetch.length; i += TAG_FETCH_CHUNK) {
    const chunk = needsFetch.slice(i, i + TAG_FETCH_CHUNK).map((row) => String(row.id));
    const { data, error } = await supabase.from("businesses").select("id, search_tags").in("id", chunk);
    if (error) {
      console.error("executeFilterSearch search_tags fetch", error);
      continue;
    }
    for (const row of data ?? []) {
      tagById.set(String((row as { id: string }).id), normalizeSearchTags((row as PoolRow).search_tags));
    }
  }

  return rows.map((row) => {
    const existing = normalizeSearchTags(row.search_tags);
    if (existing.length) return row;
    const fetched = tagById.get(String(row.id));
    return fetched ? { ...row, search_tags: fetched } : row;
  });
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
  state: DiscoveryFilterState,
  storefrontGroup: string | undefined,
  serviceGroup: string | undefined,
): PoolRow[] {
  let filtered = rows;

  if (state.entity_type === "storefront" && storefrontGroup) {
    filtered = filtered.filter((row) => matchesStorefrontGroup(row, storefrontGroup));
  }

  if (state.entity_type === "service" && serviceGroup) {
    filtered = filtered.filter((row) => matchesServiceGroup(row, serviceGroup));
  }

  if (state.tags.length) {
    filtered = filtered.filter((row) =>
      rowMatchesSearchTags(normalizeSearchTags(row.search_tags), state.tags),
    );
  }

  return filtered;
}

export async function executeFilterSearch(
  state: DiscoveryFilterState,
  options?: { town_slug?: string },
): Promise<DiscoverFilterSearchResult> {
  const violations = validateFilterContract(state);
  if (violations.length) {
    return {
      listings: [],
      total: 0,
      page: state.page,
      page_size: state.page_size,
      total_pages: 0,
      applied_filters: { ...state, contract_errors: violations },
    };
  }

  const supabase = getServiceSupabase();
  const storefrontGroup = normalizeStorefrontCategoryGroupSlug(state.category_slug);
  const serviceGroup = normalizeServiceCategoryGroupSlug(state.service_category_slug);
  const town_id = await resolveTownId(supabase, state.town_id, options?.town_slug);

  const needsMemoryPass = Boolean(storefrontGroup || serviceGroup);

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

  if (town_id) {
    query = query.eq("town_id", town_id);
  }

  if (state.tags.length > 0 && !needsMemoryPass) {
    query = query.contains("search_tags", state.tags);
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

  if (!needsMemoryPass) {
    const from = (state.page - 1) * state.page_size;
    const to = from + state.page_size - 1;

    const { data, error, count } = await query
      .order("featured", { ascending: false })
      .order("title", { ascending: true })
      .range(from, to);

    if (error) {
      console.error("executeFilterSearch", error);
      return {
        listings: [],
        total: 0,
        page: state.page,
        page_size: state.page_size,
        total_pages: 0,
        applied_filters: { ...state, town_id: town_id ?? null, error: error.message },
      };
    }

    const rows = await attachSearchTags(supabase, (data ?? []) as PoolRow[]);
    const total = count ?? 0;
    const total_pages = total > 0 ? Math.ceil(total / state.page_size) : 0;

    return {
      listings: rows.map(mapListingRow),
      total,
      page: state.page,
      page_size: state.page_size,
      total_pages,
      applied_filters: {
        entity_type: state.entity_type,
        town_id: town_id ?? null,
        category_slug: state.category_slug ?? null,
        service_category_slug: state.service_category_slug ?? null,
        tags: state.tags,
        q: state.q ?? null,
      },
    };
  }

  const { data, error } = await query
    .order("featured", { ascending: false })
    .order("title", { ascending: true })
    .limit(DISCOVER_POOL_LIMIT);

  if (error) {
    console.error("executeFilterSearch pool", error);
    return {
      listings: [],
      total: 0,
      page: state.page,
      page_size: state.page_size,
      total_pages: 0,
      applied_filters: { ...state, town_id: town_id ?? null, error: error.message },
    };
  }

  let pool = await attachSearchTags(supabase, (data ?? []) as PoolRow[]);
  pool = applyBrowsePoolFilters(pool, state, storefrontGroup, serviceGroup);
  pool = sortPoolRows(pool);

  const total = pool.length;
  const total_pages = total > 0 ? Math.ceil(total / state.page_size) : 0;
  const from = (state.page - 1) * state.page_size;
  const pageRows = pool.slice(from, from + state.page_size);

  return {
    listings: pageRows.map(mapListingRow),
    total,
    page: state.page,
    page_size: state.page_size,
    total_pages,
    applied_filters: {
      entity_type: state.entity_type,
      town_id: town_id ?? null,
      category_slug: state.category_slug ?? null,
      service_category_slug: state.service_category_slug ?? null,
      tags: state.tags,
      q: state.q ?? null,
      pool_limit: DISCOVER_POOL_LIMIT,
      storefront_group: storefrontGroup ?? null,
      service_group: serviceGroup ?? null,
    },
  };
}
