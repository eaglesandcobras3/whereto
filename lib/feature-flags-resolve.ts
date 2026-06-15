import { fetchPostHogFeatureFlags } from "@/lib/analytics/posthog-feature-flags";
import { DEFAULT_FLAGS, resolveFeatureFlags, type FeatureFlags } from "@/lib/feature-flags-core";

async function loadFeatureFlags(options?: {
  cookieHeader?: string;
  runtime?: "edge" | "node";
}): Promise<FeatureFlags> {
  const posthogFlags = await fetchPostHogFeatureFlags({
    cookieHeader: options?.cookieHeader,
    runtime: options?.runtime,
  });
  return resolveFeatureFlags(posthogFlags);
}

/** Edge middleware: PostHog flags only. */
export async function getFeatureFlagsForMiddleware(request: {
  headers: { get(name: string): string | null };
}): Promise<FeatureFlags> {
  return loadFeatureFlags({
    cookieHeader: request.headers.get("cookie") ?? undefined,
    runtime: "edge",
  });
}

export async function getAllFeatureFlagsFromCookieHeader(
  cookieHeader: string | undefined,
): Promise<FeatureFlags> {
  try {
    return loadFeatureFlags({
      cookieHeader,
      runtime: "node",
    });
  } catch {
    return DEFAULT_FLAGS;
  }
}
