import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  DEFAULT_FLAGS,
  isAskEnabled,
  isDiscoverEnabled,
  isSearchEnabled,
  isSearchInspectorEnabled,
  isOnboardEnabled,
  isReviewQueueEnabled,
  isSeoImprovementsEnabled,
  isCommunityTipsEnabled,
  isTownFactsEnabled,
  isRentalsEnabled,
  isBusinessPhotosEnabled,
  type FeatureFlags,
} from "@/lib/feature-flags-core";
import { getAllFeatureFlagsFromCookieHeader } from "@/lib/feature-flags-resolve";

export {
  DEFAULT_FLAGS,
  FEATURE_FLAG_KEYS,
  isAskEnabled,
  isDiscoverEnabled,
  isDiscoverNlEnabled,
  isSearchEnabled,
  isSearchInspectorEnabled,
  isOnboardEnabled,
  isFreeOnboardEnabled,
  isReviewQueueEnabled,
  isSeoImprovementsEnabled,
  isCommunityTipsEnabled,
  isTownFactsEnabled,
  isRentalsEnabled,
  isBusinessPhotosEnabled,
  resolveFeatureFlags,
  toDiscoveryFlags,
  type DiscoveryFlags,
  type FeatureFlagKey,
  type FeatureFlags,
} from "@/lib/feature-flags-core";

export {
  isDiscoveryEnabled,
  showNavbarAskUi,
  showNavbarDiscoverUi,
  showNavbarDiscoverQueryUi,
  showNavbarSearchUi,
  discoverHref,
  isDiscoverNlFeatureEnabled,
} from "@/lib/nav/discovery-links";

export { getFeatureFlagsForMiddleware } from "@/lib/feature-flags-resolve";

async function getAuthenticatedDistinctId(): Promise<string | undefined> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id;
  } catch {
    return undefined;
  }
}

/** Server-side flags from PostHog (middleware, API guards, redirects). */
export async function getAllFeatureFlags(): Promise<FeatureFlags> {
  try {
    const [cookieStore, distinctId] = await Promise.all([cookies(), getAuthenticatedDistinctId()]);
    const cookieHeader = cookieStore
      .getAll()
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");
    return getAllFeatureFlagsFromCookieHeader(cookieHeader, distinctId);
  } catch {
    return DEFAULT_FLAGS;
  }
}

/** Local dev escape hatch — PostHog `discover` flag still required in production. */
export function discoverDevBypassEnabled(): boolean {
  return process.env.NODE_ENV === "development" && process.env.DISCOVER_ENABLED === "1";
}

/** Local dev escape hatch — PostHog `seo_improvements` flag still required in production. */
export function seoImprovementsDevBypassEnabled(): boolean {
  return process.env.NODE_ENV === "development" && process.env.SEO_IMPROVEMENTS_ENABLED === "1";
}

export function isSeoImprovementsFeatureEnabled(flags: FeatureFlags): boolean {
  return isSeoImprovementsEnabled(flags) || seoImprovementsDevBypassEnabled();
}

/** Local dev escape hatch — PostHog `community_tips` flag still required in production. */
export function communityTipsDevBypassEnabled(): boolean {
  return process.env.NODE_ENV === "development" && process.env.COMMUNITY_TIPS_ENABLED === "1";
}

export function isCommunityTipsFeatureEnabled(flags: FeatureFlags): boolean {
  return isCommunityTipsEnabled(flags) || communityTipsDevBypassEnabled();
}

/** Local dev escape hatch — PostHog `town_facts` flag still required in production. */
export function townFactsDevBypassEnabled(): boolean {
  return process.env.NODE_ENV === "development" && process.env.TOWN_FACTS_ENABLED === "1";
}

export function isTownFactsFeatureEnabled(flags: FeatureFlags): boolean {
  return isTownFactsEnabled(flags) || townFactsDevBypassEnabled();
}

/** Local dev escape hatch — PostHog `rentals` flag still required in production. */
export function rentalsDevBypassEnabled(): boolean {
  return process.env.NODE_ENV === "development" && process.env.RENTALS_ENABLED === "1";
}

export function isRentalsFeatureEnabled(flags: FeatureFlags): boolean {
  return isRentalsEnabled(flags) || rentalsDevBypassEnabled();
}

/** Local dev escape hatch — PostHog `business_photos` flag still required in production. */
export function businessPhotosDevBypassEnabled(): boolean {
  return process.env.NODE_ENV === "development" && process.env.BUSINESS_PHOTOS_ENABLED === "1";
}

export function isBusinessPhotosFeatureEnabled(flags: FeatureFlags): boolean {
  return isBusinessPhotosEnabled(flags) || businessPhotosDevBypassEnabled();
}

export function isDiscoverFeatureEnabled(flags: FeatureFlags): boolean {
  return isDiscoverEnabled(flags) || discoverDevBypassEnabled();
}

/** For route handlers: returns a 404 response when the search feature is off. */
export async function searchApiBlocked(): Promise<NextResponse | null> {
  if (!isSearchEnabled(await getAllFeatureFlags())) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return null;
}

/** For route handlers: returns a 404 when filter-first `/discover` is off. */
export async function discoverApiBlocked(): Promise<NextResponse | null> {
  if (!isDiscoverFeatureEnabled(await getAllFeatureFlags())) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return null;
}

/** For route handlers: returns a 404 response when the ask concierge feature is off. */
export async function askApiBlocked(): Promise<NextResponse | null> {
  if (!isAskEnabled(await getAllFeatureFlags())) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return null;
}

/** For route handlers: returns a 404 when the search inspector is off. */
export async function searchInspectorApiBlocked(): Promise<NextResponse | null> {
  if (!isSearchInspectorEnabled(await getAllFeatureFlags())) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return null;
}

/** For route handlers: returns a 404 when the business portal is off. */
export async function onboardApiBlocked(): Promise<NextResponse | null> {
  if (!isOnboardEnabled(await getAllFeatureFlags())) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return null;
}

/** For route handlers: returns a 404 when neither portal nor free intake review is enabled. */
export async function reviewApiBlocked(): Promise<NextResponse | null> {
  if (!isReviewQueueEnabled(await getAllFeatureFlags())) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return null;
}

/** For route handlers: returns a 404 when community tips/reviews are off. */
export async function communityTipsApiBlocked(): Promise<NextResponse | null> {
  if (!isCommunityTipsFeatureEnabled(await getAllFeatureFlags())) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return null;
}

/** For route handlers: returns a 404 when the vacation rentals marketplace is off. */
export async function rentalsApiBlocked(): Promise<NextResponse | null> {
  if (!isRentalsFeatureEnabled(await getAllFeatureFlags())) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return null;
}

/** For route handlers: returns a 404 when business photos are off. */
export async function businessPhotosApiBlocked(): Promise<NextResponse | null> {
  if (!isBusinessPhotosFeatureEnabled(await getAllFeatureFlags())) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return null;
}
