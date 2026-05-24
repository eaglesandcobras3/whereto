/**
 * Google Analytics 4 measurement ID (`G-xxxx`).
 * Override with **`NEXT_PUBLIC_GA_MEASUREMENT_ID`**. Set to an empty string in env to disable loading GA.
 */

const raw = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/** When env is omitted, defaults to prod property. When set to **`""`**, GA is disabled. */
export function getGoogleMeasurementId(): string | null {
  if (raw === "") return null;
  if (typeof raw === "string" && raw.trim() !== "") return raw.trim();
  return "G-781F48KRLR";
}

export const GOOGLE_MEASUREMENT_ID = getGoogleMeasurementId();
