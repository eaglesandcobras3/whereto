import { DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";

/** Row must be a published, non-archived guide slug. */
export function isGuideEligibleForSitemap(row: { slug?: unknown; status?: unknown }): boolean {
  const slug = String(row.slug ?? "").trim();
  if (!slug) return false;
  const status = String(row.status ?? "").toLowerCase();
  if (status === "archived" || status === "draft") return false;
  if (status && status !== DIRECTUS_PUBLISHED_STATUS) return false;
  return true;
}
