"use client";

import { useEffect } from "react";
import { getGoogleMeasurementId } from "@/lib/analytics/google-measurement-id";

function readDataAttr(el: Element, name: string): string | undefined {
  const v = el.getAttribute(name);
  return v && v.trim() !== "" ? v : undefined;
}

/**
 * Delegated click capture for elements tagged with **`data-analytics-event`** (and optional category/label).
 * Attach **`${...gaClickProps({...})}`** on **`Link`**, **`button`**, or **`summary`** elements.
 */
export function AnalyticsClickCapture() {
  useEffect(() => {
    if (!getGoogleMeasurementId()) return;

    const onClick = (e: MouseEvent) => {
      const start = e.target;
      if (!(start instanceof Element)) return;

      const tagged = start.closest("[data-analytics-event]");
      if (!tagged) return;

      const eventName = readDataAttr(tagged, "data-analytics-event");
      if (!eventName) return;

      const category = readDataAttr(tagged, "data-analytics-category");
      const label = readDataAttr(tagged, "data-analytics-label");

      const anchor =
        tagged instanceof HTMLAnchorElement
          ? tagged
          : ((tagged.closest("a[href]") as HTMLAnchorElement | null) ?? null);

      let linkUrl = anchor?.href ?? undefined;
      let outbound = false;
      try {
        if (linkUrl) {
          const u = new URL(linkUrl);
          outbound = Boolean(u.hostname) && u.hostname !== window.location.hostname;
          linkUrl = u.toString();
        }
      } catch {
        // ignore malformed URLs
      }

      window.gtag?.("event", eventName, {
        event_category: category,
        event_label: label,
        link_url: linkUrl,
        outbound,
      });
    };

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
