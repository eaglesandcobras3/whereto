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

function buildFlagsFromPostHog(): FeatureFlags {
  const remote: Partial<FeatureFlags> = {};

  if (isPostHogEnabled()) {
    for (const key of FEATURE_FLAG_KEYS) {
      const value = posthog.isFeatureEnabled(key);
      if (value !== undefined) remote[key] = value;
    }
  }

  return resolveFeatureFlags(remote);
}

function subscribeFeatureFlags(onStoreChange: () => void): () => void {
  if (!isPostHogEnabled()) return () => {};
  return posthog.onFeatureFlags(onStoreChange);
}

/** Discovery flags from PostHog (`onFeatureFlags` + `isFeatureEnabled`). Defaults off until loaded. */
export function useAppFeatureFlags(): FeatureFlags {
  return useSyncExternalStore(
    subscribeFeatureFlags,
    buildFlagsFromPostHog,
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
  if (!isPostHogEnabled()) return defaultValue;
  const value = posthog.isFeatureEnabled(key);
  if (value === undefined) return defaultValue;
  return value;
}
