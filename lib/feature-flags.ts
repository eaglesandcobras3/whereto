import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  DEFAULT_FLAGS,
  FLAG_OVERRIDE_COOKIE,
  applyUserFeaturesLegacy,
  getFeatureFlagsForEdgeRequest,
  isAskEnabled,
  isAuthEnabled,
  isSavedEnabled,
  mergeWithCookieOverride,
  parseFlagsFromEnv,
} from "@/lib/feature-flags-core";

export {
  DEFAULT_FLAGS,
  FLAG_OVERRIDE_COOKIE,
  applyUserFeaturesLegacy,
  getFeatureFlagsForEdgeRequest,
  isAskEnabled,
  isAuthEnabled,
  isSavedEnabled,
  isSearchInspectorEnabled,
} from "@/lib/feature-flags-core";

/**
 * Feature flags: `FEATURE_FLAGS_JSON` env (server) plus optional `ff_overrides` cookie.
 * The legacy `feature_flags` table is not used; configure flags in env / deploy config.
 */
export async function getAllFeatureFlags(): Promise<Record<string, boolean>> {
  let flags = parseFlagsFromEnv();
  try {
    const cookieStore = await cookies();
    const c = cookieStore.get(FLAG_OVERRIDE_COOKIE);
    return mergeWithCookieOverride(flags, c?.value);
  } catch {
    return flags;
  }
}

export async function isFeatureEnabled(name: string): Promise<boolean> {
  const flags = await getAllFeatureFlags();
  return !!flags[name];
}

/** For route handlers: returns a 404 response when the auth feature is off. */
export async function authApiBlocked(): Promise<NextResponse | null> {
  if (!isAuthEnabled(await getAllFeatureFlags())) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return null;
}

/** For route handlers: returns a 404 response when the saved-places feature is off. */
export async function savedApiBlocked(): Promise<NextResponse | null> {
  if (!isSavedEnabled(await getAllFeatureFlags())) {
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
