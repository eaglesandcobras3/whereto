/** Visitor reports that listing details look wrong (unverified business / rental). */

import { LIST_YOUR_RENTALS_PATH } from "@/lib/stays/constants";

export const LISTING_FIELD_FLAG_TYPE = "listing_field_flag" as const;

export const LISTING_FIELD_FLAG_ENTITIES = ["business", "rental"] as const;
export type ListingFieldFlagEntity = (typeof LISTING_FIELD_FLAG_ENTITIES)[number];

/** Grouped report targets — one control per section, not per field. */
export const LISTING_FIELD_FLAG_FIELDS = [
  "header",
  "essentials",
  "description",
  "town_area",
  "map",
] as const;

export type ListingFieldFlagField = (typeof LISTING_FIELD_FLAG_FIELDS)[number];

export const LISTING_FIELD_FLAG_LABELS: Record<ListingFieldFlagField, string> = {
  header: "Listing details",
  essentials: "Essentials",
  description: "Description",
  town_area: "Town & area",
  map: "Map",
};

/** Short CTA under each section. */
export const LISTING_FIELD_FLAG_PROMPTS: Record<ListingFieldFlagField, string> = {
  header: "Something wrong with these details?",
  essentials: "Something wrong with essentials?",
  description: "Is this description wrong?",
  town_area: "Wrong town or area?",
  map: "Is this map wrong?",
};

/** Older per-field keys may still appear in the admin queue. */
export const LISTING_FIELD_FLAG_LEGACY_LABELS: Record<string, string> = {
  name: "Name",
  town: "Town",
  area: "Area",
  category: "Category",
  excerpt: "Excerpt",
  tags: "Tags",
  address: "Address",
  phone: "Phone",
  map: "Map",
  description: "Description",
};

export function listingFieldFlagLabel(field: string): string {
  if (field in LISTING_FIELD_FLAG_LABELS) {
    return LISTING_FIELD_FLAG_LABELS[field as ListingFieldFlagField];
  }
  return LISTING_FIELD_FLAG_LEGACY_LABELS[field] ?? (field || "Field");
}

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

function joinParts(parts: Array<string | null | undefined>): string | null {
  const out = parts.map((p) => (typeof p === "string" ? p.trim() : "")).filter(Boolean);
  return out.length ? out.join(" · ") : null;
}

function tagsLine(searchTags: unknown): string | null {
  const tags = Array.isArray(searchTags)
    ? searchTags.filter((t): t is string => typeof t === "string" && t.trim().length > 0)
    : [];
  return tags.length ? tags.join(", ") : null;
}

export function currentValueForBusinessGroup(
  field: ListingFieldFlagField,
  row: {
    title: string;
    address: string | null;
    phone: string | null;
    website?: string | null;
    overview: string | null;
    excerpt: string | null;
    map_lat: number | null;
    map_lng: number | null;
    search_tags: unknown;
    town_title: string | null;
    area_title: string | null;
    category_title: string | null;
  },
): string | null {
  if (field === "header") {
    return joinParts([row.title, row.category_title, row.excerpt, tagsLine(row.search_tags)]);
  }
  if (field === "essentials") {
    return joinParts([row.address, row.phone, row.website?.trim() || null]);
  }
  if (field === "description") return row.overview?.trim() || null;
  if (field === "town_area") return joinParts([row.town_title, row.area_title]);
  if (field === "map") {
    return row.map_lat != null && row.map_lng != null
      ? `${row.map_lat}, ${row.map_lng}`
      : null;
  }
  return null;
}

export function currentValueForRentalGroup(
  field: ListingFieldFlagField,
  row: {
    title: string;
    description: string | null;
    excerpt: string | null;
    street_address: string | null;
    map_lat: number | null;
    map_lng: number | null;
    search_tags: unknown;
    town_title: string | null;
    area_title: string | null;
    property_type: string | null;
    property_type_label?: string | null;
  },
): string | null {
  if (field === "header") {
    return joinParts([
      row.title,
      row.property_type_label || row.property_type,
      row.excerpt,
      tagsLine(row.search_tags),
    ]);
  }
  if (field === "essentials") {
    return row.street_address?.trim() || null;
  }
  if (field === "description") return row.description?.trim() || null;
  if (field === "town_area") return joinParts([row.town_title, row.area_title]);
  if (field === "map") {
    return row.map_lat != null && row.map_lng != null
      ? `${row.map_lat}, ${row.map_lng}`
      : null;
  }
  return null;
}
