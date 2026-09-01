"use client";

import { useAppFeatureFlags } from "@/lib/feature-flags-client";
import {
  isAdminBusinessDirectEditEnabled,
  isBusinessMapsEnabled,
  isBusinessPhotosEnabled,
  isCommunityTipsEnabled,
  isDiscoverMapsEnabled,
  isFeedbackEnabled,
  isRentalPartnersEnabled,
  isAreaFactsEnabled,
  isTownMapsEnabled,
  isTownNavEnabled,
  isTownRelationshipEnabled,
  type FeatureFlags,
} from "@/lib/feature-flags-core";

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

function areaFactsDevBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_AREA_FACTS_ENABLED === "1"
  );
}

export function isAreaFactsFeatureEnabledClient(flags: FeatureFlags): boolean {
  return isAreaFactsEnabled(flags) || areaFactsDevBypassEnabled();
}

export function useAreaFactsFeatureEnabled(): boolean {
  const flags = useAppFeatureFlags();
  return isAreaFactsFeatureEnabledClient(flags);
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

function adminBusinessDirectEditDevBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_ADMIN_BUSINESS_DIRECT_EDIT_ENABLED === "1"
  );
}

export function isAdminBusinessDirectEditFeatureEnabledClient(flags: FeatureFlags): boolean {
  return isAdminBusinessDirectEditEnabled(flags) || adminBusinessDirectEditDevBypassEnabled();
}

export function useAdminBusinessDirectEditFeatureEnabled(): boolean {
  const flags = useAppFeatureFlags();
  return isAdminBusinessDirectEditFeatureEnabledClient(flags);
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

function townMapsDevBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_TOWN_MAPS_ENABLED === "1"
  );
}

export function isTownMapsFeatureEnabledClient(flags: FeatureFlags): boolean {
  return isTownMapsEnabled(flags) || townMapsDevBypassEnabled();
}

export function useTownMapsFeatureEnabled(): boolean {
  const flags = useAppFeatureFlags();
  return isTownMapsFeatureEnabledClient(flags);
}

function townNavDevBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_TOWN_NAV_ENABLED === "1"
  );
}

export function isTownNavFeatureEnabledClient(flags: FeatureFlags): boolean {
  return isTownNavEnabled(flags) || townNavDevBypassEnabled();
}

export function useTownNavFeatureEnabled(): boolean {
  const flags = useAppFeatureFlags();
  return isTownNavFeatureEnabledClient(flags);
}

function townRelationshipDevBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_TOWN_RELATIONSHIP_ENABLED === "1"
  );
}

export function isTownRelationshipFeatureEnabledClient(flags: FeatureFlags): boolean {
  return isTownRelationshipEnabled(flags) || townRelationshipDevBypassEnabled();
}

export function useTownRelationshipFeatureEnabled(): boolean {
  const flags = useAppFeatureFlags();
  return isTownRelationshipFeatureEnabledClient(flags);
}

function discoverMapsDevBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_DISCOVER_MAPS_ENABLED === "1"
  );
}

export function isDiscoverMapsFeatureEnabledClient(flags: FeatureFlags): boolean {
  return isDiscoverMapsEnabled(flags) || discoverMapsDevBypassEnabled();
}

export function useDiscoverMapsFeatureEnabled(): boolean {
  const flags = useAppFeatureFlags();
  return isDiscoverMapsFeatureEnabledClient(flags);
}

function rentalPartnersDevBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_RENTAL_PARTNERS_ENABLED === "1"
  );
}

export function isRentalPartnersFeatureEnabledClient(flags: FeatureFlags): boolean {
  return isRentalPartnersEnabled(flags) || rentalPartnersDevBypassEnabled();
}

export function useRentalPartnersFeatureEnabled(): boolean {
  const flags = useAppFeatureFlags();
  return isRentalPartnersFeatureEnabledClient(flags);
}

function feedbackDevBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_FEEDBACK_ENABLED === "1"
  );
}

export function isFeedbackFeatureEnabledClient(flags: FeatureFlags): boolean {
  return isFeedbackEnabled(flags) || feedbackDevBypassEnabled();
}

export function useFeedbackFeatureEnabled(): boolean {
  const flags = useAppFeatureFlags();
  return isFeedbackFeatureEnabledClient(flags);
}
