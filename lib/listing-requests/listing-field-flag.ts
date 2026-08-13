/** Visitor reports that public content looks wrong (gated by PostHog `feedback`). */

import { z } from "zod";
import { categoryHubPath } from "@/lib/routes/category-hub-path";
import { LIST_YOUR_RENTALS_PATH } from "@/lib/stays/constants";
import { townPagePath } from "@/lib/routes/town-page-path";

export const LISTING_FIELD_FLAG_TYPE = "listing_field_flag" as const;

export const LISTING_FIELD_FLAG_ENTITIES = [
  "business",
  "rental",
  "town",
  "area",
  "guide",
  "category",
  "hub",
] as const;
export type ListingFieldFlagEntity = (typeof LISTING_FIELD_FLAG_ENTITIES)[number];

/** Grouped report targets — one control per section, not per field. */
export const LISTING_FIELD_FLAG_FIELDS = [
  "header",
  "essentials",
  "description",
  "town_area",
  "map",
  "facts",
  "content",
  "listings",
  "categories",
  "guides",
] as const;

export type ListingFieldFlagField = (typeof LISTING_FIELD_FLAG_FIELDS)[number];

export const LISTING_FIELD_FLAG_LABELS: Record<ListingFieldFlagField, string> = {
  header: "These details",
  essentials: "Essentials",
  description: "Description",
  town_area: "Town & area",
  map: "Map",
  facts: "At a glance",
  content: "Guide content",
  listings: "Business",
  categories: "Category",
  guides: "Guide",
};

/** Short CTA under each section. */
export const LISTING_FIELD_FLAG_PROMPT = "Suggest an update";
export const SUGGEST_A_BUSINESS_PROMPT = "Suggest a business";
export const SUGGEST_A_CATEGORY_PROMPT = "Suggest a category";
export const SUGGEST_A_GUIDE_PROMPT = "Suggest a guide";
export const ADD_BUSINESS_HREF = "/list-your-business?new=1";
export const ADD_BUSINESS_LABEL = "Add a business";

export const LISTING_FIELD_FLAG_PROMPTS: Record<ListingFieldFlagField, string> = {
  header: LISTING_FIELD_FLAG_PROMPT,
  essentials: LISTING_FIELD_FLAG_PROMPT,
  description: LISTING_FIELD_FLAG_PROMPT,
  town_area: LISTING_FIELD_FLAG_PROMPT,
  map: LISTING_FIELD_FLAG_PROMPT,
  facts: LISTING_FIELD_FLAG_PROMPT,
  content: LISTING_FIELD_FLAG_PROMPT,
  listings: SUGGEST_A_BUSINESS_PROMPT,
  categories: SUGGEST_A_CATEGORY_PROMPT,
  guides: SUGGEST_A_GUIDE_PROMPT,
};

export const LISTING_FIELD_FLAG_PLACEHOLDERS: Record<ListingFieldFlagField, string> = {
  header: "What’s wrong? (optional)",
  essentials: "What’s wrong? (optional)",
  description: "What’s wrong? (optional)",
  town_area: "What’s wrong? (optional)",
  map: "What’s wrong? (optional)",
  facts: "What’s wrong? (optional)",
  content: "What’s wrong? (optional)",
  listings: "Name and town help. (optional)",
  categories: "What should we add? (optional)",
  guides: "What should we cover? (optional)",
};

export function listingFieldFlagPrompt(field: ListingFieldFlagField): string {
  return LISTING_FIELD_FLAG_PROMPTS[field];
}

export function listingFieldFlagPlaceholder(field: ListingFieldFlagField): string {
  return LISTING_FIELD_FLAG_PLACEHOLDERS[field];
}

export function isHubSuggestionField(field: string): boolean {
  return field === "listings" || field === "categories" || field === "guides";
}

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
  /** Display title of the flagged listing / place / guide. */
  listing_title: string;
  listing_slug: string;
  /** @deprecated Prefer listing_title — kept for older queue items. */
  business_title: string;
  /** @deprecated Prefer listing_slug — kept for older queue items. */
  business_slug: string;
  current_value: string | null;
  reporter_email: string | null;
  /** Browse section the visitor was looking at (e.g. “Food & drink”). */
  section_title?: string | null;
};

export function isListingFieldFlagType(type: string): boolean {
  return type === LISTING_FIELD_FLAG_TYPE;
}

export function listingUpdatePath(opts: {
  entity?: ListingFieldFlagEntity | string | null;
  slug: string;
}): string {
  const slug = opts.slug.trim();
  if (opts.entity === "rental") {
    return `${LIST_YOUR_RENTALS_PATH}?property=${encodeURIComponent(slug)}`;
  }
  if (opts.entity === "town") {
    return townPagePath(slug);
  }
  if (opts.entity === "area") {
    return `/area/${encodeURIComponent(slug)}`;
  }
  if (opts.entity === "guide") {
    return `/guide/${encodeURIComponent(slug)}`;
  }
  if (opts.entity === "category" || opts.entity === "hub") {
    return listingFieldFlagPublicPath({ entity: opts.entity, slug }) ?? "/businesses";
  }
  return `/list-your-business?business=${encodeURIComponent(slug)}`;
}

export function listingFieldFlagCtaLabel(entity: ListingFieldFlagEntity | string): string {
  if (entity === "business" || entity === "rental") return "Open update form";
  return "Open page";
}

export function listingFieldFlagPublicPath(opts: {
  entity: ListingFieldFlagEntity | string;
  slug: string;
}): string | null {
  const slug = opts.slug.trim();
  if (!slug) return null;
  if (opts.entity === "rental") {
    return `/stays/${encodeURIComponent(slug)}`;
  }
  if (opts.entity === "town") return townPagePath(slug);
  if (opts.entity === "area") return `/area/${encodeURIComponent(slug)}`;
  if (opts.entity === "guide") return `/guide/${encodeURIComponent(slug)}`;
  if (opts.entity === "business") return `/business/${encodeURIComponent(slug)}`;
  if (opts.entity === "category") return categoryHubPath(slug);
  if (opts.entity === "hub") {
    if (slug.startsWith("/")) return slug;
    if (slug === "guides") return "/guides";
    if (slug === "businesses") return "/businesses";
    return categoryHubPath(slug);
  }
  return null;
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
  const e = payload.entity;
  if (
    e === "rental" ||
    e === "town" ||
    e === "area" ||
    e === "guide" ||
    e === "business" ||
    e === "category" ||
    e === "hub"
  ) {
    return e;
  }
  return "business";
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

export function currentValueForPlaceGroup(
  field: ListingFieldFlagField,
  row: {
    title: string;
    excerpt: string | null;
    town_title?: string | null;
  },
): string | null {
  if (field === "header") return joinParts([row.title, row.excerpt]);
  if (field === "description") return row.excerpt?.trim() || null;
  if (field === "town_area") return row.town_title?.trim() || null;
  if (field === "facts") return joinParts([row.title, "at-a-glance"]);
  if (field === "map") return row.title?.trim() || null;
  if (isHubSuggestionField(field)) return row.title?.trim() || null;
  return null;
}

export function currentValueForHubSuggestion(
  pageTitle: string,
  section: string | null,
): string | null {
  return joinParts([section, pageTitle]);
}

export function currentValueForGuideGroup(
  field: ListingFieldFlagField,
  row: {
    title: string;
    excerpt: string | null;
    content: string | null;
  },
): string | null {
  if (field === "header") return joinParts([row.title, row.excerpt]);
  if (field === "content" || field === "description") {
    const body = row.content?.trim() || row.excerpt?.trim() || null;
    if (!body) return row.title?.trim() || null;
    return body.length > 280 ? `${body.slice(0, 277)}…` : body;
  }
  return null;
}

function optionalTrimmed(max: number) {
  return z
    .string()
    .max(max)
    .optional()
    .transform((s) => {
      const t = (s ?? "").trim();
      return t || null;
    });
}

/** POST /api/listing-field-flags body. */
export const listingFieldFlagBodySchema = z.object({
  entity: z.enum(LISTING_FIELD_FLAG_ENTITIES).default("business"),
  entity_id: z.string().uuid().optional(),
  /** @deprecated Prefer entity_id — older clients sent business_id only. */
  business_id: z.string().uuid().optional(),
  field: z.enum(LISTING_FIELD_FLAG_FIELDS),
  note: optionalTrimmed(500),
  reporter_email: z
    .string()
    .max(320)
    .optional()
    .transform((s) => {
      const t = (s ?? "").trim();
      return t || null;
    })
    .refine((s) => s == null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s), {
      message: "Enter a valid email.",
    }),
  page_title: optionalTrimmed(160),
  page_slug: optionalTrimmed(160),
  section: optionalTrimmed(80),
});
