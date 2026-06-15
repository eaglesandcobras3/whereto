import {
  FEATURE_FLAG_KEYS,
  type FeatureFlagKey,
  type FeatureFlags,
} from "@/lib/feature-flags-core";
import { getPostHogHost, getPostHogKey, isPostHogEnabled } from "./posthog-config";

const ANONYMOUS_DISTINCT_ID = "server-anonymous";
const FLAG_CACHE_TTL_MS = 30_000;

type FlagCacheEntry = {
  expiresAt: number;
  flags: Record<string, boolean>;
};

const flagCache = new Map<string, FlagCacheEntry>();

function getPostHogCookieName(apiKey: string): string {
  const sanitized = apiKey.replace(/\+/g, "PL").replace(/\//g, "SL").replace(/=/g, "EQ");
  return `ph_${sanitized}_posthog`;
}

function readDistinctIdFromCookieHeader(cookieHeader: string | undefined): string {
  const apiKey = getPostHogKey();
  if (!apiKey || !cookieHeader?.trim()) return ANONYMOUS_DISTINCT_ID;

  const cookieName = getPostHogCookieName(apiKey);
  for (const pair of cookieHeader.split(";")) {
    const [rawKey, ...valueParts] = pair.trim().split("=");
    if (rawKey?.trim() !== cookieName) continue;
    const rawValue = valueParts.join("=").trim();
    if (!rawValue) break;
    try {
      const parsed = JSON.parse(decodeURIComponent(rawValue)) as { distinct_id?: unknown };
      if (typeof parsed.distinct_id === "string" && parsed.distinct_id.trim()) {
        return parsed.distinct_id.trim();
      }
    } catch {
      try {
        const parsed = JSON.parse(rawValue) as { distinct_id?: unknown };
        if (typeof parsed.distinct_id === "string" && parsed.distinct_id.trim()) {
          return parsed.distinct_id.trim();
        }
      } catch {
        return ANONYMOUS_DISTINCT_ID;
      }
    }
  }

  return ANONYMOUS_DISTINCT_ID;
}

function coerceBooleanFlag(value: unknown): boolean | undefined {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  if (typeof value === "string") return true;
  return undefined;
}

function pickKnownBooleanFlags(
  raw: Record<string, unknown> | null | undefined,
): Partial<FeatureFlags> {
  if (!raw) return {};
  const picked: Partial<FeatureFlags> = {};
  for (const key of FEATURE_FLAG_KEYS) {
    const value = coerceBooleanFlag(raw[key]);
    if (value !== undefined) picked[key] = value;
  }
  return picked;
}

function parseFlagsApiResponse(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object") return {};
  const body = payload as {
    featureFlags?: Record<string, unknown>;
    flags?: Record<string, { enabled?: boolean; variant?: string }>;
  };

  if (body.featureFlags && typeof body.featureFlags === "object") {
    return body.featureFlags;
  }

  if (body.flags && typeof body.flags === "object") {
    return Object.fromEntries(
      Object.entries(body.flags).map(([key, detail]) => [
        key,
        detail?.variant ?? detail?.enabled,
      ]),
    );
  }

  return {};
}

async function fetchPostHogFlagsFromApi(distinctId: string): Promise<Partial<FeatureFlags> | null> {
  const apiKey = getPostHogKey();
  if (!apiKey) return null;

  const cached = flagCache.get(distinctId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.flags;
  }

  try {
    const response = await fetch(`${getPostHogHost()}/flags/?v=2`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: apiKey,
        distinct_id: distinctId,
      }),
      cache: "no-store",
    });
    if (!response.ok) return null;

    const payload = await response.json();
    const flags = pickKnownBooleanFlags(parseFlagsApiResponse(payload));
    flagCache.set(distinctId, {
      flags,
      expiresAt: Date.now() + FLAG_CACHE_TTL_MS,
    });
    return flags;
  } catch {
    return null;
  }
}

async function fetchPostHogFlagsWithNode(distinctId: string): Promise<Partial<FeatureFlags> | null> {
  const { getPostHogServerClient } = await import("./posthog-server");
  const client = getPostHogServerClient();
  if (!client) return null;

  try {
    const raw = await client.getAllFlags(distinctId, {
      flagKeys: [...FEATURE_FLAG_KEYS],
    });
    return pickKnownBooleanFlags(raw as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function fetchPostHogFeatureFlags(options?: {
  cookieHeader?: string;
  distinctId?: string;
  runtime?: "edge" | "node";
}): Promise<Partial<FeatureFlags> | null> {
  if (!isPostHogEnabled()) return null;

  const distinctId =
    options?.distinctId?.trim() ||
    readDistinctIdFromCookieHeader(options?.cookieHeader) ||
    ANONYMOUS_DISTINCT_ID;

  if (options?.runtime === "node") {
    return fetchPostHogFlagsWithNode(distinctId);
  }

  return fetchPostHogFlagsFromApi(distinctId);
}
