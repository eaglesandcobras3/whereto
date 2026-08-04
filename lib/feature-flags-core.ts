/**
 * Feature-flag resolution (no `next/headers`) — safe for client components and Edge middleware.
 * Flags are PostHog-only; code defaults are all off when PostHog is unavailable.
 */

/** PostHog flag keys. */
export const FEATURE_FLAG_KEYS = [
  "search",
  "discover",
  "discover_nl",
  "ask",
  "search_inspector",
  "onboard",
  "free_onboard",
  "seo_improvements",
  "community_tips",
  "town_facts",
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];

export type FeatureFlags = Record<FeatureFlagKey, boolean>;

export const DEFAULT_FLAGS: FeatureFlags = {
  search: false,
  discover: false,
  discover_nl: false,
  ask: false,
  search_inspector: false,
  onboard: false,
  free_onboard: false,
  seo_improvements: false,
  community_tips: false,
  town_facts: false,
};

export type DiscoveryFlags = Pick<FeatureFlags, "search" | "ask">;

export function toDiscoveryFlags(flags: FeatureFlags): DiscoveryFlags {
  return {
    search: flags.search === true,
    ask: flags.ask === true,
  };
}

function pickKnownFlags(
  remote: Partial<Record<string, boolean>> | null | undefined,
): Partial<FeatureFlags> {
  const picked: Partial<FeatureFlags> = {};
  for (const key of FEATURE_FLAG_KEYS) {
    const value = remote?.[key];
    if (value === true || value === false) picked[key] = value;
  }
  return picked;
}

/** Merge PostHog evaluation into code defaults (all off). */
export function resolveFeatureFlags(
  posthogFlags: Partial<Record<string, boolean>> | null | undefined,
): FeatureFlags {
  return {
    ...DEFAULT_FLAGS,
    ...pickKnownFlags(posthogFlags),
  };
}

export function isAskEnabled(flags: DiscoveryFlags | FeatureFlags): boolean {
  return flags.ask === true;
}

export function isSearchEnabled(flags: DiscoveryFlags | FeatureFlags): boolean {
  return flags.search === true;
}

export function isDiscoverEnabled(flags: FeatureFlags): boolean {
  return flags.discover === true;
}

/** Natural-language query expansion for `/discover` (requires `discover`). */
export function isDiscoverNlEnabled(flags: FeatureFlags): boolean {
  return flags.discover === true && flags.discover_nl === true;
}

export function isSearchInspectorEnabled(flags: FeatureFlags): boolean {
  return flags.search_inspector === true;
}

export function isOnboardEnabled(flags: FeatureFlags): boolean {
  return flags.onboard === true;
}

/** Free no-account intake form + admin review queue (no portal account/payments). */
export function isFreeOnboardEnabled(flags: FeatureFlags): boolean {
  return flags.free_onboard === true;
}

/** Admin review queue is available for portal onboard and/or free intake. */
export function isReviewQueueEnabled(flags: FeatureFlags): boolean {
  return isOnboardEnabled(flags) || isFreeOnboardEnabled(flags);
}

/** SEO sprint UI: trip planning blocks, town/area planning sections, hub breadcrumbs/schema, category editorial. */
export function isSeoImprovementsEnabled(flags: FeatureFlags): boolean {
  return flags.seo_improvements === true;
}

/** Community text tips on businesses, towns, areas, and guides (optional stars; moderated). */
export function isCommunityTipsEnabled(flags: FeatureFlags): boolean {
  return flags.community_tips === true;
}

/** Town profile “at a glance” section (DB-backed facts below the hero). */
export function isTownFactsEnabled(flags: FeatureFlags): boolean {
  return flags.town_facts === true;
}
