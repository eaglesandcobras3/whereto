/**
 * Fire GA4 **`gtag` events after the snippet has loaded.** Safe no-op on the server / when GA disabled.
 */

import { getGoogleMeasurementId } from "@/lib/analytics/google-measurement-id";

export function gaEvent(eventName: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  if (!getGoogleMeasurementId()) return;

  const w = window as Window & {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  };

  w.gtag?.("event", eventName, params ?? {});
}
