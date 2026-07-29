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
import { labelForSearchTag } from "@/lib/discovery-filters/search-tag-label";
import { aggregateSearchTagCounts } from "@/lib/discovery-filters/search-tag-aggregate";
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

/** Tags that appear on listings in the current discover scope. */
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

  const pool = applyBrowsePoolFilters(
    (data ?? []) as PoolRow[],
    storefrontGroup,
    serviceGroup,
    scope.entity_type,
  );

  const counts = aggregateSearchTagCounts(pool);
  const vocabRes = await supabase
    .from("search_tags_vocabulary")
    .select("tag, description")
    .order("tag", {
      ascending: true,
    });
  const vocab = (vocabRes.data ?? []).map((row) => {
    const r = row as { tag: string; description?: string | null };
    return { slug: String(r.tag), description: r.description ?? null };
  });
  const descriptionBySlug = new Map(vocab.map((v) => [v.slug, v.description]));

  const tagsInScope = new Set(counts.keys());
  const orderedSlugs =
    vocab.length > 0
      ? vocab.map((v) => v.slug).filter((slug) => tagsInScope.has(slug))
      : [...tagsInScope].sort((a, b) => a.localeCompare(b));

  return orderedSlugs.map((slug) => {
    const count = counts.get(slug) ?? 0;
    return {
      slug,
      label: labelForSearchTag(slug, descriptionBySlug.get(slug)),
      count,
    };
  });
}
