import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { getPublicImageUrlWithView } from "@/lib/media/public-image-url";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { businessCategoryGroupForSlug } from "@/lib/business-categories/groups";
import { serviceCategoryGroupForSlug } from "@/lib/service-categories/groups";
import type { ServiceCategorySlug } from "@/lib/service-categories/constants";
import { validateFilterContract } from "@/lib/discovery-filters/filter-contract";
import type { DiscoveryFilterState, FacetTag } from "@/lib/discovery-filters/filter-state";
import {
  normalizeServiceCategoryGroupSlug,
  normalizeStorefrontCategoryGroupSlug,
} from "@/lib/discovery-filters/resolve-category-groups";
import type { DiscoverFilterSearchResult, DiscoverListingRow } from "@/lib/discovery-filters/types";

const DISCOVER_POOL_LIMIT = 2000;
const TAG_FETCH_CHUNK = 120;

const VIEW_LISTING_SELECT =
  "id, slug, title, excerpt, business_type, main_image, hero_image, main_image_url, hero_image_url, search_keywords, town_id, featured, business_categories ( slug ), service_categories ( slug ), towns ( title, slug )";

const TAG_SELECT =
  "id, item_tags, search_tags, atmosphere_tags, occasion_tags, meal_period_tags, dietary_tags";

type PoolRow = Record<string, unknown>;

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

function rowMatchesFacetTags(row: PoolRow, facetTags: FacetTag[]): boolean {
  if (!facetTags.length) return true;
  return facetTags.some((tag) => {
    const values = row[tag.family] as string[] | null | undefined;
    return Array.isArray(values) && values.includes(tag.slug);
  });
}

async function attachTagColumns(
  supabase: SupabaseClient,
  rows: PoolRow[],
): Promise<PoolRow[]> {
  if (!rows.length) return rows;
  const tagById = new Map<string, PoolRow>();

  for (let i = 0; i < rows.length; i += TAG_FETCH_CHUNK) {
    const chunk = rows.slice(i, i + TAG_FETCH_CHUNK).map((row) => String(row.id));
    const { data, error } = await supabase.from("businesses").select(TAG_SELECT).in("id", chunk);
    if (error) {
      console.error("executeFilterSearch tag fetch", error);
      continue;
    }
    for (const row of data ?? []) {
      tagById.set(String((row as { id: string }).id), row as PoolRow);
    }
  }

  return rows.map((row) => ({
    ...row,
    ...(tagById.get(String(row.id)) ?? {}),
  }));
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

  const needsMemoryPass = Boolean(
    storefrontGroup || serviceGroup || state.facet_tags.length > 0,
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

  if (town_id) {
    query = query.eq("town_id", town_id);
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

    const total = count ?? 0;
    const total_pages = total > 0 ? Math.ceil(total / state.page_size) : 0;

    return {
      listings: (data ?? []).map((row) => mapListingRow(row as PoolRow)),
      total,
      page: state.page,
      page_size: state.page_size,
      total_pages,
      applied_filters: {
        entity_type: state.entity_type,
        town_id: town_id ?? null,
        category_slug: state.category_slug ?? null,
        service_category_slug: state.service_category_slug ?? null,
        facet_tags: state.facet_tags,
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

  let pool = applyBrowsePoolFilters((data ?? []) as PoolRow[], state, storefrontGroup, serviceGroup);

  if (state.facet_tags.length > 0) {
    pool = (await attachTagColumns(supabase, pool)).filter((row) =>
      rowMatchesFacetTags(row, state.facet_tags),
    );
  }

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
      facet_tags: state.facet_tags,
      q: state.q ?? null,
      pool_limit: DISCOVER_POOL_LIMIT,
      storefront_group: storefrontGroup ?? null,
      service_group: serviceGroup ?? null,
    },
  };
}
