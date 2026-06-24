import { fetchPostHogFeatureFlags } from "@/lib/analytics/posthog-feature-flags";
import { DEFAULT_FLAGS, resolveFeatureFlags, type FeatureFlags } from "@/lib/feature-flags-core";

async function loadFeatureFlags(options?: {
  cookieHeader?: string;
  distinctId?: string;
  runtime?: "edge" | "node";
}): Promise<FeatureFlags> {
  const posthogFlags = await fetchPostHogFeatureFlags({
    cookieHeader: options?.cookieHeader,
    distinctId: options?.distinctId,
    runtime: options?.runtime,
  });
  return resolveFeatureFlags(posthogFlags);
}

/** Edge middleware: PostHog flags only. */
export async function getFeatureFlagsForMiddleware(
  request: {
    headers: { get(name: string): string | null };
  },
  distinctId?: string,
): Promise<FeatureFlags> {
  return loadFeatureFlags({
    cookieHeader: request.headers.get("cookie") ?? undefined,
    distinctId,
    runtime: "edge",
  });
}

export async function getAllFeatureFlagsFromCookieHeader(
  cookieHeader: string | undefined,
  distinctId?: string,
): Promise<FeatureFlags> {
  try {
    return loadFeatureFlags({
      cookieHeader,
      distinctId,
      runtime: "node",
    });
  } catch {
    return DEFAULT_FLAGS;
  }
}
