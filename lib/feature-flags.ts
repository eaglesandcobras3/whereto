import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  DEFAULT_FLAGS,
  FEATURE_FLAG_KEYS,
  isAskEnabled,
  isSearchEnabled,
  isSearchInspectorEnabled,
  isOnboardEnabled,
  type FeatureFlags,
} from "@/lib/feature-flags-core";
import { getAllFeatureFlagsFromCookieHeader } from "@/lib/feature-flags-resolve";

export {
  DEFAULT_FLAGS,
  FEATURE_FLAG_KEYS,
  isAskEnabled,
  isSearchEnabled,
  isSearchInspectorEnabled,
  isOnboardEnabled,
  resolveFeatureFlags,
  toDiscoveryFlags,
  type DiscoveryFlags,
  type FeatureFlagKey,
  type FeatureFlags,
} from "@/lib/feature-flags-core";

export {
  isDiscoveryEnabled,
  showHubDiscoveryUi,
  showNavbarAskUi,
  showNavbarSearchUi,
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

/** For route handlers: returns a 404 response when the search feature is off. */
export async function searchApiBlocked(): Promise<NextResponse | null> {
  if (!isSearchEnabled(await getAllFeatureFlags())) {
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
