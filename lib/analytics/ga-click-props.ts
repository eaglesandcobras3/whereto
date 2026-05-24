/**
 * Props for delegated GA4 captures — see **`AnalyticsClickCapture`**.
 * Uses explicit `data-*` keys (React 19 typings omit them from **`Pick<HTMLAttributes, ...>`**).
 */

export type GaClickAnalyticsProps = {
  "data-analytics-event": string;
  "data-analytics-category"?: string;
  "data-analytics-label"?: string;
};

export function gaClickProps(args: {
  /** GA4 custom event name for reports. */
  event: string;
  category?: string;
  label?: string;
}): GaClickAnalyticsProps {
  const out: GaClickAnalyticsProps = { "data-analytics-event": args.event };
  if (args.category) out["data-analytics-category"] = args.category;
  if (args.label) out["data-analytics-label"] = args.label;
  return out;
}
