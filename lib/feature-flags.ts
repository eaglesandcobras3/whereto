import { cookies } from "next/headers";

const FLAG_OVERRIDE_COOKIE = "ff_overrides";

const DEFAULT_FLAGS: Record<string, boolean> = {
  search: true,
  towns: true,
  featured_business: true,
  user_features: true,
  experimental: false,
};

function parseEnvFlags(): Record<string, boolean> {
  const raw = process.env.FEATURE_FLAGS_JSON?.trim();
  if (!raw) return { ...DEFAULT_FLAGS };
  try {
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return { ...DEFAULT_FLAGS, ...parsed };
  } catch {
    return { ...DEFAULT_FLAGS };
  }
}

/**
 * Feature flags: `FEATURE_FLAGS_JSON` env (server) plus optional `ff_overrides` cookie.
 * The legacy `feature_flags` table is not used; configure flags in env / deploy config.
 */
export async function getAllFeatureFlags(): Promise<Record<string, boolean>> {
  let flags = parseEnvFlags();

  try {
    const cookieStore = await cookies();
    const overrideCookie = cookieStore.get(FLAG_OVERRIDE_COOKIE);
    if (overrideCookie?.value) {
      const overrides = JSON.parse(overrideCookie.value) as Record<string, boolean>;
      flags = { ...flags, ...overrides };
    }
  } catch {
    /* ignore */
  }

  return flags;
}

export async function isFeatureEnabled(name: string): Promise<boolean> {
  const flags = await getAllFeatureFlags();
  return !!flags[name];
}
