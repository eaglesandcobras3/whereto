import { getServiceSupabase } from "./supabase/service-role";

export type FeatureFlag = {
  name: string;
  enabled: boolean;
};

/**
 * Fetch all feature flags from the database.
 * Use this in RSCs or API routes.
 */
export async function getAllFeatureFlags(): Promise<Record<string, boolean>> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("feature_flags")
    .select("name, enabled");

  if (error || !data) {
    console.error("Error fetching feature flags:", error);
    return {};
  }

  return data.reduce((acc, flag) => {
    acc[flag.name] = flag.enabled;
    return acc;
  }, {} as Record<string, boolean>);
}

/**
 * Check if a specific feature flag is enabled.
 */
export async function isFeatureEnabled(name: string): Promise<boolean> {
  const flags = await getAllFeatureFlags();
  return !!flags[name];
}
