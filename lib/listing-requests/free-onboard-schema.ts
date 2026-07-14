/** Free intake field limits and shared Zod schemas. */

import { z } from "zod";
import { externalWebsiteHref } from "@/lib/urls/external-website-href";

export const FREE_ONBOARD_TITLE_MAX = 80;
export const FREE_ONBOARD_EXCERPT_MAX = 160;
export const FREE_ONBOARD_OVERVIEW_MAX = 1000;
export const FREE_ONBOARD_LOCATIONS_MAX = 10;
export const FREE_ONBOARD_SEARCH_TAGS_MAX = 6;

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

/** Accepts bare domains or full URLs; empty → null. Scheme is added when missing. */
const optionalWebsite = z
  .string()
  .max(500)
  .optional()
  .transform((s) => externalWebsiteHref(s));

export const freeOnboardLocationSchema = z.object({
  id: z.string().trim().min(1).max(64).optional(),
  town_id: z.string().uuid(),
  address: z
    .string()
    .max(500)
    .optional()
    .transform((s) => (s ?? "").trim() || null),
});

export const freeOnboardBodySchema = z.object({
  _hp_company_website: z.string().max(200).optional(),
  submitter_name: z.string().trim().min(1).max(120),
  submitter_email: z.string().trim().email().max(320),
  title: z.string().trim().min(2).max(FREE_ONBOARD_TITLE_MAX),
  is_storefront: z.boolean().optional().default(false),
  is_service_business: z.boolean().optional().default(false),
  locations: z.array(freeOnboardLocationSchema).min(1).max(FREE_ONBOARD_LOCATIONS_MAX),
  website: optionalWebsite,
  phone: z
    .string()
    .max(40)
    .optional()
    .transform((s) => (s ?? "").trim() || null),
  excerpt: z.string().trim().min(10).max(FREE_ONBOARD_EXCERPT_MAX),
  overview: z.string().trim().min(15).max(FREE_ONBOARD_OVERVIEW_MAX),
  category_id: z.string().uuid(),
  search_tags: z.array(z.string().trim().min(1).max(64)).max(FREE_ONBOARD_SEARCH_TAGS_MAX).default([]),
  search_keywords: z
    .string()
    .max(500)
    .optional()
    .transform((s) => (s ?? "").trim() || null),
  marketing_opt_in: z.boolean().optional().default(false),
  target_business_id: z.string().uuid().optional().nullable(),
  target_business_slug: z.string().trim().max(200).optional().nullable(),
});

export type FreeOnboardBody = z.infer<typeof freeOnboardBodySchema>;

/** Slim body for “delete my listing” from the update form. */
export const freeOnboardRemovalBodySchema = z.object({
  intent: z.literal("removal"),
  _hp_company_website: z.string().max(200).optional(),
  submitter_name: z.string().trim().min(1).max(120),
  submitter_email: z.string().trim().email().max(320),
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
  search_keywords: string | null;
  marketing_opt_in: boolean;
  target_business_id: string | null;
  locations: FreeOnboardLocationPayload[];
  /** Set after the single submitter decision email is sent for this intake. */
  submitter_notified?: boolean;
};
