"use client";

import { useAppFeatureFlags } from "@/lib/feature-flags-client";
import {
  isBusinessMapsEnabled,
  isBusinessPhotosEnabled,
  isCommunityTipsEnabled,
  isSeoImprovementsEnabled,
  isTownFactsEnabled,
  type FeatureFlags,
} from "@/lib/feature-flags-core";

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

function communityTipsDevBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_COMMUNITY_TIPS_ENABLED === "1"
  );
}

export function isCommunityTipsFeatureEnabledClient(flags: FeatureFlags): boolean {
  return isCommunityTipsEnabled(flags) || communityTipsDevBypassEnabled();
}

export function useCommunityTipsFeatureEnabled(): boolean {
  const flags = useAppFeatureFlags();
  return isCommunityTipsFeatureEnabledClient(flags);
}

function townFactsDevBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_TOWN_FACTS_ENABLED === "1"
  );
}

export function isTownFactsFeatureEnabledClient(flags: FeatureFlags): boolean {
  return isTownFactsEnabled(flags) || townFactsDevBypassEnabled();
}

export function useTownFactsFeatureEnabled(): boolean {
  const flags = useAppFeatureFlags();
  return isTownFactsFeatureEnabledClient(flags);
}

function businessPhotosDevBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_BUSINESS_PHOTOS_ENABLED === "1"
  );
}

export function isBusinessPhotosFeatureEnabledClient(flags: FeatureFlags): boolean {
  return isBusinessPhotosEnabled(flags) || businessPhotosDevBypassEnabled();
}

export function useBusinessPhotosFeatureEnabled(): boolean {
  const flags = useAppFeatureFlags();
  return isBusinessPhotosFeatureEnabledClient(flags);
}

function businessMapsDevBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_BUSINESS_MAPS_ENABLED === "1"
  );
}

export function isBusinessMapsFeatureEnabledClient(flags: FeatureFlags): boolean {
  return isBusinessMapsEnabled(flags) || businessMapsDevBypassEnabled();
}

export function useBusinessMapsFeatureEnabled(): boolean {
  const flags = useAppFeatureFlags();
  return isBusinessMapsFeatureEnabledClient(flags);
}
