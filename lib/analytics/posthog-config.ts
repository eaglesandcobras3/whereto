/**
 * PostHog project key (`phc_…`). Set **`NEXT_PUBLIC_POSTHOG_KEY`**; use an empty string to disable.
 */

const rawKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const rawHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

export function getPostHogKey(): string | null {
  if (rawKey === "") return null;
  if (typeof rawKey === "string" && rawKey.trim() !== "") return rawKey.trim();
  return null;
}

/** PostHog ingest host — defaults to US cloud. */
export function getPostHogHost(): string {
  if (typeof rawHost === "string" && rawHost.trim() !== "") return rawHost.trim();
  return "https://us.i.posthog.com";
}

export function isPostHogEnabled(): boolean {
  return getPostHogKey() !== null;
}
