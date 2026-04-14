import { cookies } from "next/headers";
import { getServiceSupabase } from "./supabase/service-role";

export type FeatureFlag = {
  name: string;
  enabled: boolean;
};

/**
 * Cookie name for local feature flag overrides.
 * Set this cookie to a JSON object to override flags locally.
 * Example: {"user_features":true,"experimental":true}
 */
const FLAG_OVERRIDE_COOKIE = "ff_overrides";

/**
 * Fetch all feature flags from the database.
 * Supports cookie-based overrides for local development.
 *
 * To enable flags locally without affecting production:
 * 1. Open browser dev tools → Application → Cookies
 * 2. Add cookie: ff_overrides = {"user_features":true}
 * 3. Refresh the page
 */
export async function getAllFeatureFlags(): Promise<Record<string, boolean>> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("feature_flags")
    .select("name, enabled");

  let flags: Record<string, boolean> = {};

  if (error || !data) {
    console.error("Error fetching feature flags:", error);
  } else {
    flags = data.reduce((acc, flag) => {
      acc[flag.name] = flag.enabled;
      return acc;
    }, {} as Record<string, boolean>);
  }

  // Apply cookie overrides (for local development)
  try {
    const cookieStore = await cookies();
    const overrideCookie = cookieStore.get(FLAG_OVERRIDE_COOKIE);
    if (overrideCookie?.value) {
      const overrides = JSON.parse(overrideCookie.value) as Record<string, boolean>;
      flags = { ...flags, ...overrides };
    }
  } catch {
    // Ignore cookie parsing errors
  }

  return flags;
}

/**
 * Check if a specific feature flag is enabled.
 */
export async function isFeatureEnabled(name: string): Promise<boolean> {
  const flags = await getAllFeatureFlags();
  return !!flags[name];
}
