import { PostHog } from "posthog-node";
import { getPostHogKey, getPostHogHost } from "./posthog-config";

export function getPostHogServerClient(): PostHog | null {
  const key = getPostHogKey();
  if (!key) return null;
  return new PostHog(key, {
    host: getPostHogHost(),
    flushAt: 1,
    flushInterval: 0,
  });
}
