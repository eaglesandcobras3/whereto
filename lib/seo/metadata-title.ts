import type { Metadata } from "next";

/**
 * Root layout sets `title: { template: "%s | WhereTo30A", ... }`.
 * Child routes must pass **only the page-specific segment** here, or a CMS string that may
 * already end with `| WhereTo30A` / `| WhereTo30a` — this strips that suffix once so titles
 * are not doubled (e.g. "Town | WhereTo30A | WhereTo30A").
 */
const TRAILING_SITE_BRAND = /\s*\|\s*WhereTo30a\s*$/i;

export function titleSegmentForLayoutTemplate(value: string | null | undefined): string {
  if (value == null) return "";
  const t = String(value).trim();
  if (!t) return "";
  return t.replace(TRAILING_SITE_BRAND, "").trim() || t;
}

/** Use when the document title must be exactly `WhereTo30A` (no template suffix). */
export const metadataTitleSiteOnly: Metadata["title"] = { absolute: "WhereTo30A" };
