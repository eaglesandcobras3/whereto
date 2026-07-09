import { businessCategoryGroupForSlug } from "@/lib/business-categories/groups";
import { serviceCategoryGroupForSlug } from "@/lib/service-categories/groups";
import type { ServiceCategorySlug } from "@/lib/service-categories/constants";
import {
  CUISINE_PREFERRED_STOREFRONT_GROUPS,
  hasCuisineProductTags,
} from "@/lib/discovery-filters/cuisine-product-tags";
import type { DiscoveryFilterState } from "@/lib/discovery-filters/filter-state";
import { analyzeTagMatch, type TagMatchAnalysis } from "@/lib/discovery-filters/tag-match";
import { normalizeSearchTags } from "@/lib/discovery-filters/search-tag-aggregate";

const TAG_WEIGHT = 100;
const ENTITY_TYPE_WEIGHT = 50;
const CATEGORY_WEIGHT = 40;
/** Cuisine/product tag searches prefer restaurants and markets without hard-filtering. */
const CUISINE_CATEGORY_WEIGHT = 35;
/** Near-search anchor town — listed before other towns in the expanded zone. */
const TOWN_ANCHOR_WEIGHT = 75;

export type DiscoverListingScopeMatch = {
  entity_type_match: boolean;
  category_match: boolean;
};

export type DiscoverListingScore = {
  tag_match: TagMatchAnalysis;
  scope_match: DiscoverListingScopeMatch;
  /** Higher = better fit when sorting results. */
  score: number;
  /** Listing passes hard filters for the current mode. */
  passes: boolean;
};

type PoolRow = Record<string, unknown>;

export function rowMatchesEntityType(
  row: PoolRow,
  entityType: DiscoveryFilterState["entity_type"],
): boolean {
  if (entityType === "service") return Boolean(row.is_service_business);
  return Boolean(row.is_storefront);
}

export function rowMatchesStorefrontGroup(row: PoolRow, groupSlug: string): boolean {
  const cat = row.business_categories as { slug?: string } | null;
  return businessCategoryGroupForSlug(cat?.slug ?? null) === groupSlug;
}

export function rowMatchesServiceGroup(row: PoolRow, groupSlug: string): boolean {
  const svc = row.service_categories as { slug?: string } | null;
  const slug = svc?.slug?.trim().toLowerCase();
  if (!slug) return false;
  return serviceCategoryGroupForSlug(slug as ServiceCategorySlug) === groupSlug;
}

function rowMatchesCategory(
  row: PoolRow,
  entityType: DiscoveryFilterState["entity_type"],
  storefrontGroup: string | undefined,
  serviceGroup: string | undefined,
): boolean {
  if (entityType === "storefront" && storefrontGroup) {
    return rowMatchesStorefrontGroup(row, storefrontGroup);
  }
  if (entityType === "service" && serviceGroup) {
    return rowMatchesServiceGroup(row, serviceGroup);
  }
  return true;
}

export function scoreDiscoverListing(
  row: PoolRow,
  state: DiscoveryFilterState,
  storefrontGroup: string | undefined,
  serviceGroup: string | undefined,
): DiscoverListingScore {
  const tag_match = analyzeTagMatch(normalizeSearchTags(row.search_tags), state.tags);
  const hasTags = state.tags.length > 0;
  const entity_type_match = rowMatchesEntityType(row, state.entity_type);
  const category_match = rowMatchesCategory(
    row,
    state.entity_type,
    storefrontGroup,
    serviceGroup,
  );

  let passes: boolean;
  if (hasTags) {
    passes = tag_match.matches;
  } else {
    passes = entity_type_match && category_match;
  }

  let score = tag_match.score * TAG_WEIGHT;
  if (hasTags) {
    if (entity_type_match) score += ENTITY_TYPE_WEIGHT;
    if (category_match) score += CATEGORY_WEIGHT;
    if (hasCuisineProductTags(state.tags) && !storefrontGroup && !serviceGroup) {
      const cat = row.business_categories as { slug?: string } | null;
      const group = businessCategoryGroupForSlug(cat?.slug ?? null);
      if (group && CUISINE_PREFERRED_STOREFRONT_GROUPS.includes(group)) {
        score += CUISINE_CATEGORY_WEIGHT;
      }
    }
  }

  if (state.anchor_town_ids.length) {
    const townId = String(row.town_id ?? "");
    if (townId && state.anchor_town_ids.includes(townId)) {
      score += TOWN_ANCHOR_WEIGHT;
    }
  }

  return {
    tag_match,
    scope_match: { entity_type_match, category_match },
    score,
    passes,
  };
}

export function compareDiscoverListingScore(a: DiscoverListingScore, b: DiscoverListingScore): number {
  if (a.score !== b.score) return b.score - a.score;
  return 0;
}
