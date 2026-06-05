/**
 * Fire PostHog events from client code. Safe no-op on the server / when analytics disabled.
 * Kept as **`gaEvent`** so existing call sites do not need renames.
 */

import posthog from "posthog-js";
import { isPostHogEnabled } from "@/lib/analytics/posthog-config";

export function captureEvent(eventName: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  if (!isPostHogEnabled()) return;
  posthog.capture(eventName, params ?? {});
}

/** @deprecated Prefer **`captureEvent`** — alias kept for existing imports. */
export const gaEvent = captureEvent;
