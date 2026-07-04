import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  DEFAULT_FLAGS,
  FEATURE_FLAG_KEYS,
  isAskEnabled,
  isDiscoverEnabled,
  isSearchEnabled,
  isSearchInspectorEnabled,
  isOnboardEnabled,
  isGuidesEnabled,
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
  isGuidesEnabled,
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
