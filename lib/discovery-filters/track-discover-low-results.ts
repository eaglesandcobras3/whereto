import "server-only";

import { getPostHogServerClient } from "@/lib/analytics/posthog-server";
import {
  buildDiscoverFilterKey,
  getDiscoverLowResultsMax,
  shouldTrackDiscoverLowResults,
} from "@/lib/discovery-filters/discover-low-results";
import type { DiscoveryFilterState } from "@/lib/discovery-filters/filter-state";
import type { DiscoverFilterSearchResult } from "@/lib/discovery-filters/types";

export type DiscoverLowResultsTrackInput = {
  state: DiscoveryFilterState;
  result: DiscoverFilterSearchResult;
};

/**
 * PostHog telemetry when Discover returns few results for an active filter set.
 * Surfaces tag coverage gaps — see `discover_low_results` in docs/posthog-trends-alerts.md.
 */
export async function trackDiscoverLowResults(
  input: DiscoverLowResultsTrackInput,
): Promise<void> {
  const { state, result } = input;
  if (!shouldTrackDiscoverLowResults(state, result)) return;

  const posthog = getPostHogServerClient();
  if (!posthog) return;

  const applied = result.applied_filters;
  const filterKey = buildDiscoverFilterKey(state);
  const lowResultsThreshold = getDiscoverLowResultsMax(state);

  try {
    await posthog.capture({
      distinctId: "discover_filter_system",
      event: "discover_low_results",
      properties: {
        result_count: result.total,
        low_results_threshold: lowResultsThreshold,
        town_scope:
          state.town_ids.length === 0
            ? "all"
            : state.town_ids.length === 1
              ? "single"
              : "multi",
        filter_key: filterKey,
        entity_type: state.entity_type,
        town_ids: state.town_ids,
        tags: state.tags,
        category_slug: state.category_slug ?? null,
        service_category_slug: state.service_category_slug ?? null,
        q: state.q?.trim() || null,
        filter_mode:
          typeof applied.filter_mode === "string" ? applied.filter_mode : null,
        has_tags: state.tags.length > 0,
        tag_count: state.tags.length,
        town_count: state.town_ids.length,
      },
    });
    await posthog.shutdown();
  } catch (err) {
    console.error("trackDiscoverLowResults", err);
  }
}
