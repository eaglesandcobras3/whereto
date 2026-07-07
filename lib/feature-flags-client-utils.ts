"use client";

import { useAppFeatureFlags } from "@/lib/feature-flags-client";
import { isSeoImprovementsEnabled, type FeatureFlags } from "@/lib/feature-flags-core";

function seoImprovementsDevBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_SEO_IMPROVEMENTS_ENABLED === "1"
  );
}

export function isSeoImprovementsFeatureEnabledClient(flags: FeatureFlags): boolean {
  return isSeoImprovementsEnabled(flags) || seoImprovementsDevBypassEnabled();
}

export function useSeoImprovementsFeatureEnabled(): boolean {
  const flags = useAppFeatureFlags();
  return isSeoImprovementsFeatureEnabledClient(flags);
}
