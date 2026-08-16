import { RENTAL_INDEX_MIN_UNIQUE_TEXT } from "@/lib/stays/constants";
import type { RentalPropertyView } from "@/lib/stays/types";

export type RentalIndexReadinessFields = {
  slug?: string | null;
  status?: string | null;
  description?: string | null;
  local_context?: string | null;
  excerpt?: string | null;
  hero_image_url?: string | null;
  primary_image_url?: string | null;
  town_id?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  sleeps?: number | null;
  booking_url?: string | null;
  content_rights_confirmed?: boolean | null;
  partner_status?: string | null;
  duplicate_of_property_id?: string | null;
};

function textLen(...parts: Array<string | null | undefined>): number {
  return parts.reduce((n, p) => n + (p?.trim().length ?? 0), 0);
}

export function hasRentalListingImage(row: RentalIndexReadinessFields): boolean {
  return Boolean(row.hero_image_url?.trim() || row.primary_image_url?.trim());
}

/** Whether a rental may appear in sitemap / be indexable. */
export function isRentalIndexReady(row: RentalIndexReadinessFields): boolean {
  const slug = row.slug?.trim();
  if (!slug) return false;
  if (row.status !== "published") return false;
  if (row.partner_status !== "active") return false;
  if (row.duplicate_of_property_id) return false;
  if (!row.content_rights_confirmed) return false;
  if (!row.booking_url?.trim()) return false;
  if (row.town_id == null) return false;
  if (row.bedrooms == null || row.bathrooms == null || row.sleeps == null) return false;

  const uniqueText = textLen(row.excerpt, row.description, row.local_context);
  if (uniqueText < RENTAL_INDEX_MIN_UNIQUE_TEXT) return false;
  if (!hasRentalListingImage(row)) return false;

  return true;
}

export function isPublicRentalVisible(
  row: Pick<RentalPropertyView, "status" | "partner_status">,
): boolean {
  return row.status === "published" && row.partner_status === "active";
}
