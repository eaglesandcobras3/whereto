/**
 * Feature-flag resolution (no `next/headers`) — safe for client components and Edge middleware.
 */

export const FLAG_OVERRIDE_COOKIE = "ff_overrides" as const;

export const DEFAULT_FLAGS: Record<string, boolean> = {
  search: false,
  towns: true,
  featured_business: true,
  /** Legacy: when `false`, `auth` and `saved` are treated as off. */
  user_features: true,
  /** Sign in, sign up, profile, auth callback, and auth-gated APIs (e.g. claims). */
  auth: true,
  /** Saved places, collections, `/api/saves`, `/api/collections`. */
  saved: true,
  /** When `true`, header browse nav includes **Services** (`/search?type=services`). Default off until listings are ready. */
  services_nav: false,
  /** When `true`, `/guide` shows the teal “Ready to Explore?” search CTA at the bottom. Default off. */
  guide_hub_search_callout: false,
};

function mergeFromJson(
  base: Record<string, boolean>,
  raw: string | undefined,
): Record<string, boolean> {
  if (!raw?.trim()) return { ...base };
  try {
    return { ...base, ...JSON.parse(raw) as Record<string, boolean> };
  } catch {
    return { ...base };
  }
}

/** Returns parsed keys when JSON is valid, else **`null`** (invalid or empty). */
function featureFlagsJsonKeys(raw: string | undefined): Set<string> | null {
  if (!raw?.trim()) return null;
  try {
    return new Set(Object.keys(JSON.parse(raw) as Record<string, unknown>));
  } catch {
    return null;
  }
}

/**
 * If `user_features` is false (legacy), force auth and saved off to match old behavior.
 */
export function applyUserFeaturesLegacy(
  flags: Record<string, boolean>,
): Record<string, boolean> {
  if (flags.user_features === false) {
    return { ...flags, auth: false, saved: false };
  }
  return flags;
}

export function parseFlagsFromEnv(): Record<string, boolean> {
  const flags = applyUserFeaturesLegacy(
    mergeFromJson({ ...DEFAULT_FLAGS }, process.env.FEATURE_FLAGS_JSON),
  );
  const envKeys = featureFlagsJsonKeys(process.env.FEATURE_FLAGS_JSON);
  if (process.env.NODE_ENV === "development" && !envKeys?.has("search")) {
    return { ...flags, search: true };
  }
  return flags;
}

export function mergeWithCookieOverride(
  flags: Record<string, boolean>,
  overrideCookie: string | undefined,
): Record<string, boolean> {
  if (!overrideCookie?.trim()) return flags;
  try {
    const overrides = JSON.parse(overrideCookie) as Record<string, boolean>;
    return applyUserFeaturesLegacy({ ...flags, ...overrides });
  } catch {
    return flags;
  }
}

/** Edge / middleware: env + `ff_overrides` cookie. */
export function getFeatureFlagsForEdgeRequest(
  getCookie: (name: string) => string | undefined,
): Record<string, boolean> {
  return mergeWithCookieOverride(parseFlagsFromEnv(), getCookie(FLAG_OVERRIDE_COOKIE));
}

export function isAuthEnabled(flags: Record<string, boolean>): boolean {
  if (flags.user_features === false) return false;
  return flags.auth !== false;
}

export function isSavedEnabled(flags: Record<string, boolean>): boolean {
  if (flags.user_features === false) return false;
  return flags.saved !== false;
}
