import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { getPublicImageUrlWithView } from "@/lib/media/public-image-url";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { buildFacetOrFilter } from "@/lib/discovery-filters/compile-filter-query";
import { validateFilterContract } from "@/lib/discovery-filters/filter-contract";
import type { DiscoveryFilterState } from "@/lib/discovery-filters/filter-state";
import {
  normalizeServiceCategoryGroupSlug,
  normalizeStorefrontCategoryGroupSlug,
  resolveServiceCategoryIds,
  resolveStorefrontCategoryIds,
} from "@/lib/discovery-filters/resolve-category-groups";
import type { DiscoverFilterSearchResult, DiscoverListingRow } from "@/lib/discovery-filters/types";

const LISTING_SELECT =
  "id, slug, title, excerpt, business_type, main_image, hero_image, main_image_url, hero_image_url, search_keywords, town_id, primary_category_id, service_category_id, item_tags, search_tags, atmosphere_tags, occasion_tags, meal_period_tags, dietary_tags, business_categories ( slug ), service_categories ( slug ), towns ( title, slug )";

type ResolvedIds = {
  town_id?: string;
  category_ids?: string[];
  service_category_ids?: string[];
};

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

function mapListingRow(row: Record<string, unknown>): DiscoverListingRow {
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

  const [town_id, category_ids, service_category_ids] = await Promise.all([
    resolveTownId(supabase, state.town_id, options?.town_slug),
    storefrontGroup
      ? resolveStorefrontCategoryIds(supabase, storefrontGroup)
      : Promise.resolve(undefined),
    serviceGroup ? resolveServiceCategoryIds(supabase, serviceGroup) : Promise.resolve(undefined),
  ]);

  const resolved: ResolvedIds = { town_id, category_ids, service_category_ids };

  // Tag columns live on `businesses`; visibility pool matches browse hubs via `businesses_view` filters.
  let query = supabase
    .from("businesses")
    .select(LISTING_SELECT, { count: "exact" })
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN);

  if (state.entity_type === "service") {
    query = query.eq("is_service_business", true);
  } else {
    query = query.eq("is_storefront", true);
  }

  if (resolved.town_id) {
    query = query.eq("town_id", resolved.town_id);
  }

  if (state.entity_type === "storefront" && category_ids?.length) {
    query = query.in("primary_category_id", category_ids);
  } else if (state.entity_type === "storefront" && storefrontGroup && !category_ids?.length) {
    return {
      listings: [],
      total: 0,
      page: state.page,
      page_size: state.page_size,
      total_pages: 0,
      applied_filters: {
        ...state,
        resolved,
        error: `No category IDs resolved for group ${storefrontGroup}`,
      },
    };
  }

  if (state.entity_type === "service" && service_category_ids?.length) {
    query = query.in("service_category_id", service_category_ids);
  } else if (state.entity_type === "service" && serviceGroup && !service_category_ids?.length) {
    return {
      listings: [],
      total: 0,
      page: state.page,
      page_size: state.page_size,
      total_pages: 0,
      applied_filters: {
        ...state,
        resolved,
        error: `No service category IDs resolved for group ${serviceGroup}`,
      },
    };
  }

  const facetOr = buildFacetOrFilter(state.facet_tags);
  if (facetOr) {
    query = query.or(facetOr);
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
      applied_filters: { ...state, resolved, error: error.message },
    };
  }

  const total = count ?? 0;
  const total_pages = total > 0 ? Math.ceil(total / state.page_size) : 0;

  return {
    listings: (data ?? []).map((row) => mapListingRow(row as Record<string, unknown>)),
    total,
    page: state.page,
    page_size: state.page_size,
    total_pages,
    applied_filters: {
      entity_type: state.entity_type,
      town_id: resolved.town_id ?? null,
      category_slug: state.category_slug ?? null,
      service_category_slug: state.service_category_slug ?? null,
      facet_tags: state.facet_tags,
      q: state.q ?? null,
    },
  };
}
