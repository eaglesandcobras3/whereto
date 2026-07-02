/**
 * Feature-flag resolution (no `next/headers`) — safe for client components and Edge middleware.
 * Flags are PostHog-only; code defaults are all off when PostHog is unavailable.
 */

/** PostHog flag keys. */
export const FEATURE_FLAG_KEYS = [
  "search",
  "discover",
  "ask",
  "search_inspector",
  "onboard",
  "guides",
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];

export type FeatureFlags = Record<FeatureFlagKey, boolean>;

export const DEFAULT_FLAGS: FeatureFlags = {
  search: false,
  discover: false,
  ask: false,
  search_inspector: false,
  onboard: false,
  guides: false,
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

export function isSearchInspectorEnabled(flags: FeatureFlags): boolean {
  return flags.search_inspector === true;
}

export function isOnboardEnabled(flags: FeatureFlags): boolean {
  return flags.onboard === true;
}

export function isGuidesEnabled(flags: FeatureFlags): boolean {
  return flags.guides === true;
}
