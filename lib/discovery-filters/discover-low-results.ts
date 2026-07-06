import type { DiscoveryFilterState } from "@/lib/discovery-filters/filter-state";
import type { DiscoverFilterSearchResult } from "@/lib/discovery-filters/types";

export const DISCOVER_LOW_RESULTS_MAX = 3;

/** True when the user narrowed Discover beyond the default entity type alone. */
export function hasActiveDiscoverFilters(state: DiscoveryFilterState): boolean {
  return (
    state.tags.length > 0 ||
    state.town_ids.length > 0 ||
    Boolean(state.category_slug) ||
    Boolean(state.service_category_slug) ||
    Boolean(state.q?.trim())
  );
}

/** Stable key for PostHog breakdowns and alert context. */
export function buildDiscoverFilterKey(state: DiscoveryFilterState): string {
  const towns =
    state.town_ids.length > 0 ? [...state.town_ids].sort().join("+") : "all";
  const category =
    state.entity_type === "storefront"
      ? (state.category_slug ?? "all")
      : (state.service_category_slug ?? "all");
  const tags = state.tags.length > 0 ? [...state.tags].sort().join("+") : "none";
  const q = state.q?.trim().toLowerCase() || "none";
  return `${state.entity_type}|towns:${towns}|category:${category}|tags:${tags}|q:${q}`;
}

export function shouldTrackDiscoverLowResults(
  state: DiscoveryFilterState,
  result: DiscoverFilterSearchResult,
): boolean {
  if (state.page !== 1) return false;
  if (result.total > DISCOVER_LOW_RESULTS_MAX) return false;
  if (!hasActiveDiscoverFilters(state)) return false;
  if (typeof result.applied_filters.error === "string") return false;
  if (Array.isArray(result.applied_filters.contract_errors)) return false;
  return true;
}
