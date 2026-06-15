"use client";

import { useSyncExternalStore } from "react";
import posthog from "posthog-js";
import {
  useFeatureFlagEnabled as usePostHogFeatureFlagEnabled,
  PostHogFeature,
} from "posthog-js/react";
import { isPostHogEnabled } from "@/lib/analytics/posthog-config";
import {
  DEFAULT_FLAGS,
  FEATURE_FLAG_KEYS,
  resolveFeatureFlags,
  type FeatureFlagKey,
  type FeatureFlags,
} from "@/lib/feature-flags-core";

export { PostHogFeature };
export { usePostHogFeatureFlagEnabled as useFeatureFlagEnabled };

function posthogFlagsReady(): boolean {
  if (!isPostHogEnabled()) return false;
  const featureFlags = posthog.featureFlags;
  return featureFlags.hasLoadedFlags || featureFlags.getFlags().length > 0;
}

function readPostHogBooleanFlag(key: FeatureFlagKey): boolean | undefined {
  const value = posthog.isFeatureEnabled(key);
  if (value === true || value === false) return value;
  return undefined;
}

function buildFlagsFromPostHog(): FeatureFlags {
  if (!posthogFlagsReady()) return DEFAULT_FLAGS;

  const remote: Partial<FeatureFlags> = {};
  for (const key of FEATURE_FLAG_KEYS) {
    const value = readPostHogBooleanFlag(key);
    if (value !== undefined) remote[key] = value;
  }

  return resolveFeatureFlags(remote);
}

let cachedSnapshot: FeatureFlags = DEFAULT_FLAGS;

function flagsEqual(a: FeatureFlags, b: FeatureFlags): boolean {
  for (const key of FEATURE_FLAG_KEYS) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

function getFeatureFlagsSnapshot(): FeatureFlags {
  const next = buildFlagsFromPostHog();
  if (flagsEqual(cachedSnapshot, next)) return cachedSnapshot;
  cachedSnapshot = next;
  return cachedSnapshot;
}

function subscribeFeatureFlags(onStoreChange: () => void): () => void {
  if (!isPostHogEnabled()) return () => {};
  return posthog.onFeatureFlags(onStoreChange);
}

/** Discovery flags from PostHog (`onFeatureFlags` + `isFeatureEnabled`). Defaults off until loaded. */
export function useAppFeatureFlags(): FeatureFlags {
  return useSyncExternalStore(
    subscribeFeatureFlags,
    getFeatureFlagsSnapshot,
    () => DEFAULT_FLAGS,
  );
}

export function useAppFeatureFlag(key: FeatureFlagKey): boolean {
  const defaultValue = DEFAULT_FLAGS[key];
  const enabled = usePostHogFeatureFlagEnabled(key, defaultValue);
  if (!isPostHogEnabled()) return defaultValue;
  return enabled;
}

export function isAppFeatureEnabled(key: FeatureFlagKey): boolean {
  const defaultValue = DEFAULT_FLAGS[key];
  if (!posthogFlagsReady()) return defaultValue;
  const value = readPostHogBooleanFlag(key);
  if (value === undefined) return defaultValue;
  return value;
}
