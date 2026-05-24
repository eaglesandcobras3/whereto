/**
 * Props for delegated GA4 captures — see **`AnalyticsClickCapture`**.
 * Mirrors common GA UA-style dimensions via GA4 **`event_category`** /** **`event_label`** params.
 */

import type { HTMLAttributes } from "react";

export function gaClickProps(args: {
  /** GA4 recommended custom name (use snake_case-ish labels in **`event_label`** for reports). */
  event: string;
  category?: string;
  label?: string;
}): Pick<HTMLAttributes<HTMLElement>, "data-analytics-event" | "data-analytics-category" | "data-analytics-label"> {
  const out: Record<string, string> = { "data-analytics-event": args.event };
  if (args.category) out["data-analytics-category"] = args.category;
  if (args.label) out["data-analytics-label"] = args.label;
  return out as Pick<
    HTMLAttributes<HTMLElement>,
    "data-analytics-event" | "data-analytics-category" | "data-analytics-label"
  >;
}
