/** Visitor reports that a listing field looks wrong (unverified business / rental). */

import { LIST_YOUR_RENTALS_PATH } from "@/lib/stays/constants";

export const LISTING_FIELD_FLAG_TYPE = "listing_field_flag" as const;

export const LISTING_FIELD_FLAG_ENTITIES = ["business", "rental"] as const;
export type ListingFieldFlagEntity = (typeof LISTING_FIELD_FLAG_ENTITIES)[number];

export const LISTING_FIELD_FLAG_FIELDS = [
  "name",
  "town",
  "area",
  "category",
  "excerpt",
  "tags",
  "description",
  "address",
  "phone",
  "map",
] as const;

export type ListingFieldFlagField = (typeof LISTING_FIELD_FLAG_FIELDS)[number];

export const LISTING_FIELD_FLAG_LABELS: Record<ListingFieldFlagField, string> = {
  name: "Name",
  town: "Town",
  area: "Area",
  category: "Category",
  excerpt: "Excerpt",
  tags: "Tags",
  description: "Description",
  address: "Address",
  phone: "Phone",
  map: "Map location",
};

export type ListingFieldFlagPayload = {
  source: "listing_field_flag";
  entity: ListingFieldFlagEntity;
  field: ListingFieldFlagField;
  note: string | null;
  /** Display title of the flagged listing (business name or rental title). */
  listing_title: string;
  listing_slug: string;
  /** @deprecated Prefer listing_title — kept for older queue items. */
  business_title: string;
  /** @deprecated Prefer listing_slug — kept for older queue items. */
  business_slug: string;
  current_value: string | null;
  reporter_email: string | null;
};

export function isListingFieldFlagType(type: string): boolean {
  return type === LISTING_FIELD_FLAG_TYPE;
}

export function listingUpdatePath(opts: {
  entity?: ListingFieldFlagEntity | string | null;
  slug: string;
}): string {
  if (opts.entity === "rental") {
    return `${LIST_YOUR_RENTALS_PATH}?property=${encodeURIComponent(opts.slug)}`;
  }
  return `/list-your-business?business=${encodeURIComponent(opts.slug)}`;
}

export function listingFieldFlagSlugFromPayload(payload: Record<string, unknown>): string {
  if (typeof payload.listing_slug === "string" && payload.listing_slug.trim()) {
    return payload.listing_slug.trim();
  }
  if (typeof payload.business_slug === "string" && payload.business_slug.trim()) {
    return payload.business_slug.trim();
  }
  return "";
}

export function listingFieldFlagEntityFromPayload(
  payload: Record<string, unknown>,
): ListingFieldFlagEntity {
  return payload.entity === "rental" ? "rental" : "business";
}
