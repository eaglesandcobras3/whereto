/** Free intake field limits and shared Zod schemas. */

import { z } from "zod";
import { externalWebsiteHref } from "@/lib/urls/external-website-href";

export const FREE_ONBOARD_TITLE_MAX = 80;
export const FREE_ONBOARD_EXCERPT_MAX = 160;
export const FREE_ONBOARD_OVERVIEW_MAX = 500;
export const FREE_ONBOARD_LOCATIONS_MAX = 10;
export const FREE_ONBOARD_SEARCH_TAGS_MAX = 6;
/** Max gallery photos a submitter can attach on free intake. */
export const FREE_ONBOARD_PHOTOS_MAX = 8;
/** Cap for a single suggested category/specialty phrase. */
export const FREE_ONBOARD_SUGGESTED_CATEGORY_MAX = 80;
/** Cap for generated search_keywords strings written on approve/submit. */
export const FREE_ONBOARD_SEARCH_KEYWORDS_MAX = 255;

/**
 * Parse a comma-separated suggested-tags field into trimmed unique phrases.
 * Keeps human-readable wording for operator review (not written to search_tags until approved/vocab).
 */
export function parseSuggestedTagsInput(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const tag = part.trim().slice(0, 64);
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}

export const FREE_ONBOARD_TYPES = {
  newListing: "free_new_listing",
  update: "free_update",
  removal: "free_removal",
} as const;

export type FreeOnboardReviewType =
  (typeof FREE_ONBOARD_TYPES)[keyof typeof FREE_ONBOARD_TYPES];

export function isFreeOnboardReviewType(type: string): type is FreeOnboardReviewType {
  return (
    type === FREE_ONBOARD_TYPES.newListing ||
    type === FREE_ONBOARD_TYPES.update ||
    type === FREE_ONBOARD_TYPES.removal
  );
}

function looksLikeWebsite(raw: string): boolean {
  const href = externalWebsiteHref(raw);
  if (!href) return true;
  try {
    const u = new URL(href);
    return Boolean(u.hostname && u.hostname.includes("."));
  } catch {
    return false;
  }
}

/** Accepts bare domains or full URLs; empty → null. Scheme is added when missing (never double-prefixed). */
const optionalWebsite = z
  .string()
  .max(500)
  .optional()
  .transform((s) => (s ?? "").trim())
  .refine((s) => !s || looksLikeWebsite(s), {
    message: "Enter a valid website URL or domain (e.g. example.com).",
  })
  .transform((s) => (s ? externalWebsiteHref(s) : null));

function phoneDigitCount(raw: string): number {
  return raw.replace(/\D/g, "").length;
}

/** Optional phone — if provided, require a plausible digit length. */
const optionalPhone = z
  .string()
  .max(40)
  .optional()
  .transform((s) => (s ?? "").trim())
  .refine((s) => !s || (phoneDigitCount(s) >= 7 && phoneDigitCount(s) <= 15), {
    message: "Enter a valid phone number.",
  })
  .transform((s) => s || null);

export const freeOnboardLocationSchema = z.object({
  id: z.string().trim().min(1, { message: "Location id is required." }).max(64).optional(),
  town_id: z.string().uuid({ message: "Choose a town for each location." }),
  address: z
    .string()
    .max(500, { message: "Address is too long." })
    .optional()
    .transform((s) => (s ?? "").trim() || null),
  map_lat: z
    .number()
    .min(-90, { message: "Latitude must be between -90 and 90." })
    .max(90, { message: "Latitude must be between -90 and 90." })
    .optional()
    .nullable()
    .transform((n) => (n == null || !Number.isFinite(n) ? null : n)),
  map_lng: z
    .number()
    .min(-180, { message: "Longitude must be between -180 and 180." })
    .max(180, { message: "Longitude must be between -180 and 180." })
    .optional()
    .nullable()
    .transform((n) => (n == null || !Number.isFinite(n) ? null : n)),
});

export const freeOnboardPhotoSchema = z.object({
  public_url: z.string().url({ message: "Photo URL is invalid." }).max(2000),
  storage_path: z
    .string()
    .trim()
    .min(1, { message: "Photo storage path is required." })
    .max(500),
  /** Admin include/exclude before approve; defaults to include. */
  include: z.boolean().optional().default(true),
});

export const freeOnboardBodySchema = z
  .object({
    _hp_company_website: z.string().max(200).optional(),
    submitter_name: z
      .string()
      .trim()
      .max(120, { message: "Name is too long." })
      .optional()
      .default("")
      .transform((s) => s.trim()),
    submitter_email: z
      .string()
      .trim()
      .max(320, { message: "Email is too long." })
      .optional()
      .default("")
      .transform((s) => s.trim()),
    title: z
      .string()
      .trim()
      .min(2, { message: "Enter a business name (at least 2 characters)." })
      .max(FREE_ONBOARD_TITLE_MAX, {
        message: `Business name must be ${FREE_ONBOARD_TITLE_MAX} characters or fewer.`,
      }),
    is_storefront: z.boolean().optional().default(false),
    is_service_business: z.boolean().optional().default(false),
    locations: z
      .array(freeOnboardLocationSchema)
      .max(FREE_ONBOARD_LOCATIONS_MAX, {
        message: `You can add at most ${FREE_ONBOARD_LOCATIONS_MAX} locations.`,
      })
      .default([]),
    website: optionalWebsite,
    phone: optionalPhone,
    excerpt: z
      .string()
      .trim()
      .min(10, { message: "Write a short headline (at least 10 characters)." })
      .max(FREE_ONBOARD_EXCERPT_MAX, {
        message: `Headline must be ${FREE_ONBOARD_EXCERPT_MAX} characters or fewer.`,
      }),
    overview: z
      .string()
      .trim()
      .min(15, { message: "Write a short overview (at least 15 characters)." })
      .max(FREE_ONBOARD_OVERVIEW_MAX, {
        message: `Overview must be ${FREE_ONBOARD_OVERVIEW_MAX} characters or fewer.`,
      }),
    /** Unified leaf category (`business_categories` with parent rollup). */
    category_id: z
      .string()
      .uuid({ message: "Choose a category from the list." })
      .optional()
      .nullable()
      .transform((s) => s || null),
    /**
     * Additional leaf categories (includes or implies primary). Max 5 total.
     * Used when `multiple_category` feature flag is on; ignored otherwise.
     */
    category_ids: z
      .array(z.string().uuid({ message: "Choose categories from the list." }))
      .max(5, { message: "Choose at most 5 categories." })
      .optional()
      .default([]),
    /**
     * @deprecated Use category_id (unified taxonomy). Kept for older payloads.
     */
    service_category_id: z
      .string()
      .uuid({ message: "Choose a category from the list." })
      .optional()
      .nullable()
      .transform((s) => s || null),
    search_tags: z
      .array(
        z
          .string()
          .trim()
          .min(1, { message: "Tag cannot be empty." })
          .max(64, { message: "Tag is too long." }),
      )
      .max(FREE_ONBOARD_SEARCH_TAGS_MAX, {
        message: `Choose at most ${FREE_ONBOARD_SEARCH_TAGS_MAX} tags.`,
      })
      .default([]),
    /** Freeform tag proposals for operators — share the 6-tag budget with search_tags. */
    suggested_tags: z
      .array(
        z
          .string()
          .trim()
          .min(1, { message: "Suggested tag cannot be empty." })
          .max(64, { message: "Suggested tag is too long." }),
      )
      .max(FREE_ONBOARD_SEARCH_TAGS_MAX, {
        message: `Choose at most ${FREE_ONBOARD_SEARCH_TAGS_MAX} tags.`,
      })
      .default([]),
    /**
     * Freeform category proposal when the list is missing a fit.
     * Satisfies the category requirement when category_id is empty.
     */
    suggested_category: z
      .string()
      .max(FREE_ONBOARD_SUGGESTED_CATEGORY_MAX, {
        message: `Suggested category must be ${FREE_ONBOARD_SUGGESTED_CATEGORY_MAX} characters or fewer.`,
      })
      .optional()
      .nullable()
      .transform((s) => {
        const t = (s ?? "").trim().slice(0, FREE_ONBOARD_SUGGESTED_CATEGORY_MAX);
        return t || null;
      }),
    /** Admin-only on approve; submitters always get false. */
    is_explorable: z.boolean().optional().default(false),
    /**
     * Admin-only listing image URL (from /api/admin/media/upload).
     * Omit to leave the existing image unchanged on update; null clears; URL sets.
     * Ignored for non-admin submissions.
     */
    main_image_url: z
      .union([
        z.string().url({ message: "Image URL is invalid." }).max(2000),
        z.null(),
      ])
      .optional(),
    /** Gallery photos uploaded during free intake (pending admin include/exclude). */
    photos: z
      .array(freeOnboardPhotoSchema)
      .max(FREE_ONBOARD_PHOTOS_MAX, {
        message: `You can attach at most ${FREE_ONBOARD_PHOTOS_MAX} photos.`,
      })
      .default([]),
    marketing_opt_in: z.boolean().optional().default(false),
    target_business_id: z.string().uuid({ message: "Listing id is invalid." }).optional().nullable(),
    target_business_slug: z.string().trim().max(200).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.submitter_email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.submitter_email)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a valid email.",
          path: ["submitter_email"],
        });
      }
    }
    if (!data.is_storefront && !data.is_service_business) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select whether you have a physical location, operate as a service business, or both.",
        path: ["is_storefront"],
      });
    }
    if (data.is_storefront && data.locations.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add at least one town and address for your physical location.",
        path: ["locations"],
      });
    }
    if (!data.is_storefront && data.locations.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Locations are only allowed when you have a physical location.",
        path: ["locations"],
      });
    }
    if (!data.category_id && !data.suggested_category) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose a category or suggest one that is missing from the list.",
        path: ["category_id"],
      });
    }
    if (data.search_tags.length + data.suggested_tags.length > FREE_ONBOARD_SEARCH_TAGS_MAX) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Choose at most ${FREE_ONBOARD_SEARCH_TAGS_MAX} tags total across search tags and suggested tags.`,
        path: ["suggested_tags"],
      });
    }
  });

export type FreeOnboardBody = z.infer<typeof freeOnboardBodySchema>;

export const FREE_ONBOARD_REMOVAL_REASON_MAX = 500;

/** Slim body for “delete my listing” from the update form. */
export const freeOnboardRemovalBodySchema = z.object({
  intent: z.literal("removal"),
  _hp_company_website: z.string().max(200).optional(),
  submitter_name: z
    .string()
    .trim()
    .min(1, { message: "Name is required." })
    .max(120, { message: "Name is too long." }),
  submitter_email: z
    .string()
    .trim()
    .email({ message: "Enter a valid email." })
    .max(320, { message: "Email is too long." }),
  reason: z
    .string()
    .trim()
    .min(10, { message: "Please share a brief reason (at least 10 characters)." })
    .max(FREE_ONBOARD_REMOVAL_REASON_MAX, {
      message: `Reason must be ${FREE_ONBOARD_REMOVAL_REASON_MAX} characters or fewer.`,
    }),
  target_business_id: z.string().uuid({ message: "Listing id is invalid." }).optional().nullable(),
  target_business_slug: z
    .string()
    .trim()
    .min(1, { message: "Missing listing. Refresh the page and try again." })
    .max(200),
});

/** Human labels for API fieldErrors — used on list-your-business / free intake. */
export const FREE_ONBOARD_FIELD_LABELS: Record<string, string> = {
  submitter_name: "Your name",
  submitter_email: "Your email",
  title: "Business name",
  is_storefront: "How you operate",
  is_service_business: "How you operate",
  locations: "Locations",
  website: "Website",
  phone: "Phone",
  excerpt: "Headline / summary",
  overview: "Overview description",
  category_id: "Category",
  service_category_id: "Category",
  suggested_category: "Category",
  search_tags: "Search tags",
  suggested_tags: "Search tags",
  photos: "Photos",
  main_image_url: "Main image",
  reason: "Reason for removal",
  target_business_slug: "Listing",
  target_business_id: "Listing",
};

/**
 * Turn Zod flatten fieldErrors into a user-facing message that names the field.
 * Prefers the first non-empty message; prefixes with the field label when known.
 */
export function formatFreeOnboardFieldErrors(
  fieldErrors: Record<string, string[] | undefined> | null | undefined,
): string | null {
  if (!fieldErrors) return null;
  for (const [key, msgs] of Object.entries(fieldErrors)) {
    const msg = msgs?.find((m) => typeof m === "string" && m.trim());
    if (!msg) continue;
    const label = FREE_ONBOARD_FIELD_LABELS[key];
    return label ? `${label}: ${msg}` : msg;
  }
  return null;
}

export type FreeOnboardRemovalBody = z.infer<typeof freeOnboardRemovalBodySchema>;

export type FreeOnboardRemovalPayload = {
  source: "free_onboard";
  intent: "removal";
  submitter_name: string;
  submitter_email: string;
  title: string;
  reason: string;
  target_business_id: string;
  target_business_slug: string;
  /** Set after the single submitter decision email is sent for this intake. */
  submitter_notified?: boolean;
};

export type FreeOnboardPhotoPayload = {
  public_url: string;
  storage_path: string;
  /** Admin include/exclude; omitted means include. */
  include?: boolean;
};

export type FreeOnboardLocationPayload = {
  id: string;
  town_id: string;
  town_title?: string | null;
  town_slug?: string | null;
  address: string | null;
  map_lat?: number | null;
  map_lng?: number | null;
  status: "pending" | "created" | "skipped";
  resulting_business_id?: string | null;
  resulting_business_slug?: string | null;
};

export type FreeOnboardPayload = {
  source: "free_onboard";
  submitter_name: string;
  submitter_email: string;
  title: string;
  is_storefront: boolean;
  is_service_business: boolean;
  website: string | null;
  phone: string | null;
  excerpt: string;
  overview: string;
  /** Unified leaf category id. */
  category_id: string | null;
  /** Extra leaf ids when multiple_category is enabled (may include primary). */
  category_ids?: string[];
  category_title?: string | null;
  /** @deprecated Cleared on approve after unified migration. */
  service_category_id?: string | null;
  service_category_title?: string | null;
  search_tags: string[];
  /** Submitter proposals for tags missing from vocabulary; not applied to businesses.search_tags. */
  suggested_tags?: string[];
  /**
   * Submitter proposal for a missing category.
   * Not applied until an admin creates or maps it on approve.
   */
  suggested_category?: string | null;
  /** Town/area visibility; default false on intake; admin may enable. */
  is_explorable?: boolean;
  /** Derived server-side from name, type, category, and tags — not collected on the form. */
  search_keywords: string | null;
  marketing_opt_in: boolean;
  target_business_id: string | null;
  locations: FreeOnboardLocationPayload[];
  /** Gallery photos from free intake; admin may set include false before approve. */
  photos?: FreeOnboardPhotoPayload[];
  /** Admin-only hero/main image public URL. Omit when unchanged on update. */
  main_image_url?: string | null;
  /** True when an admin submitted without typing name/email (filled from session). */
  submitted_by_admin?: boolean;
  /** Set after the single submitter decision email is sent for this intake. */
  submitter_notified?: boolean;
};
