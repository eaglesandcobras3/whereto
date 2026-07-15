/** Free intake field limits and shared Zod schemas. */

import { z } from "zod";
import { externalWebsiteHref } from "@/lib/urls/external-website-href";

export const FREE_ONBOARD_TITLE_MAX = 80;
export const FREE_ONBOARD_EXCERPT_MAX = 160;
export const FREE_ONBOARD_OVERVIEW_MAX = 500;
export const FREE_ONBOARD_LOCATIONS_MAX = 10;
export const FREE_ONBOARD_SEARCH_TAGS_MAX = 6;
/** Comma-separated SEO keyword phrases — keep within a practical SERP/meta budget. */
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
  id: z.string().trim().min(1).max(64).optional(),
  town_id: z.string().uuid(),
  address: z
    .string()
    .max(500)
    .optional()
    .transform((s) => (s ?? "").trim() || null),
});

export const freeOnboardBodySchema = z
  .object({
    _hp_company_website: z.string().max(200).optional(),
    submitter_name: z.string().trim().min(1).max(120),
    submitter_email: z.string().trim().email().max(320),
    title: z.string().trim().min(2).max(FREE_ONBOARD_TITLE_MAX),
    is_storefront: z.boolean().optional().default(false),
    is_service_business: z.boolean().optional().default(false),
    locations: z.array(freeOnboardLocationSchema).max(FREE_ONBOARD_LOCATIONS_MAX).default([]),
    website: optionalWebsite,
    phone: optionalPhone,
    excerpt: z.string().trim().min(10).max(FREE_ONBOARD_EXCERPT_MAX),
    overview: z.string().trim().min(15).max(FREE_ONBOARD_OVERVIEW_MAX),
    category_id: z.string().uuid(),
    search_tags: z
      .array(z.string().trim().min(1).max(64))
      .max(FREE_ONBOARD_SEARCH_TAGS_MAX)
      .default([]),
    /** Freeform tag proposals for operators — share the 6-tag budget with search_tags. */
    suggested_tags: z
      .array(z.string().trim().min(1).max(64))
      .max(FREE_ONBOARD_SEARCH_TAGS_MAX)
      .default([]),
    search_keywords: z
      .string()
      .max(FREE_ONBOARD_SEARCH_KEYWORDS_MAX)
      .optional()
      .transform((s) => (s ?? "").trim() || null),
    marketing_opt_in: z.boolean().optional().default(false),
    target_business_id: z.string().uuid().optional().nullable(),
    target_business_slug: z.string().trim().max(200).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.is_storefront && data.is_service_business) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose either a physical location or a service business — not both.",
        path: ["is_storefront"],
      });
    }
    if (!data.is_storefront && !data.is_service_business) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select whether you have a physical location or operate as a service business.",
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
  submitter_name: z.string().trim().min(1).max(120),
  submitter_email: z.string().trim().email().max(320),
  reason: z.string().trim().min(10).max(FREE_ONBOARD_REMOVAL_REASON_MAX),
  target_business_id: z.string().uuid().optional().nullable(),
  target_business_slug: z.string().trim().min(1).max(200),
});

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

export type FreeOnboardLocationPayload = {
  id: string;
  town_id: string;
  town_title?: string | null;
  town_slug?: string | null;
  address: string | null;
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
  category_id: string;
  category_title?: string | null;
  search_tags: string[];
  /** Submitter proposals for tags missing from vocabulary; not applied to businesses.search_tags. */
  suggested_tags?: string[];
  search_keywords: string | null;
  marketing_opt_in: boolean;
  target_business_id: string | null;
  locations: FreeOnboardLocationPayload[];
  /** Set after the single submitter decision email is sent for this intake. */
  submitter_notified?: boolean;
};
