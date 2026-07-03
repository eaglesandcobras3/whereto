import "server-only";

import { getServiceSupabase } from "@/lib/supabase/service-role";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { businessCategoryGroupForSlug } from "@/lib/business-categories/groups";
import { serviceCategoryGroupForSlug } from "@/lib/service-categories/groups";
import type { ServiceCategorySlug } from "@/lib/service-categories/constants";
import type { DiscoveryEntityType } from "@/lib/discovery-filters/filter-state";
import {
  normalizeServiceCategoryGroupSlug,
  normalizeStorefrontCategoryGroupSlug,
} from "@/lib/discovery-filters/resolve-category-groups";
import { formatSearchTagLabel } from "@/lib/discovery-filters/search-tag-label";
import {
  aggregateSearchTagCounts,
  normalizeSearchTags,
} from "@/lib/discovery-filters/search-tag-aggregate";
import type { DiscoverSearchTagOption } from "@/lib/discovery-filters/load-discover-options";

const SCOPED_TAG_POOL_LIMIT = 2000;

export type DiscoverTagScope = {
  entity_type: DiscoveryEntityType;
  town_ids: string[];
  category_slug?: string;
  service_category_slug?: string;
};

type PoolRow = Record<string, unknown>;

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

function applyBrowsePoolFilters(
  rows: PoolRow[],
  storefrontGroup: string | undefined,
  serviceGroup: string | undefined,
  entityType: DiscoveryEntityType,
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

async function attachSearchTags(rows: PoolRow[]): Promise<PoolRow[]> {
  const supabase = getServiceSupabase();
  const needsFetch = rows.filter((row) => normalizeSearchTags(row.search_tags).length === 0);
  if (!needsFetch.length) return rows;

  const tagById = new Map<string, string[]>();
  const chunkSize = 120;
  for (let i = 0; i < needsFetch.length; i += chunkSize) {
    const chunk = needsFetch.slice(i, i + chunkSize).map((row) => String(row.id));
    const { data, error } = await supabase.from("businesses").select("id, search_tags").in("id", chunk);
    if (error) {
      console.error("loadScopedSearchTags search_tags fetch", error);
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

/** Tags that appear on listings in the current discover scope (with counts). */
export async function loadScopedSearchTags(scope: DiscoverTagScope): Promise<DiscoverSearchTagOption[]> {
  const supabase = getServiceSupabase();
  const storefrontGroup = normalizeStorefrontCategoryGroupSlug(scope.category_slug);
  const serviceGroup = normalizeServiceCategoryGroupSlug(scope.service_category_slug);

  let query = supabase
    .from("businesses_view")
    .select("id, search_tags, business_categories ( slug ), service_categories ( slug )")
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .limit(SCOPED_TAG_POOL_LIMIT);

  if (scope.entity_type === "service") {
    query = query.eq("is_service_business", true);
  } else {
    query = query.eq("is_storefront", true);
  }

  if (scope.town_ids.length) {
    query = query.in("town_id", scope.town_ids);
  }

  const { data, error } = await query;
  if (error) {
    console.error("loadScopedSearchTags", error);
    return [];
  }

  let pool = await attachSearchTags((data ?? []) as PoolRow[]);
  pool = applyBrowsePoolFilters(pool, storefrontGroup, serviceGroup, scope.entity_type);

  const counts = aggregateSearchTagCounts(pool);
  const vocabRes = await supabase.from("search_tags_vocabulary").select("tag").order("tag", {
    ascending: true,
  });
  const vocab = (vocabRes.data ?? []).map((row) => String((row as { tag: string }).tag));

  const tagsInScope = new Set(counts.keys());
  const orderedSlugs =
    vocab.length > 0
      ? vocab.filter((slug) => tagsInScope.has(slug))
      : [...tagsInScope].sort((a, b) => a.localeCompare(b));

  return orderedSlugs.map((slug) => {
    const count = counts.get(slug) ?? 0;
    const label = formatSearchTagLabel(slug);
    return {
      slug,
      label: count > 0 ? `${label} (${count})` : label,
      count,
    };
  });
}
