import { z } from "zod";
import { externalWebsiteHref } from "@/lib/urls/external-website-href";
import { RENTAL_BEACH_ACCESS, RENTAL_PROPERTY_TYPES } from "@/lib/stays/types";

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

const optionalUrl = z
  .string()
  .max(2000)
  .optional()
  .nullable()
  .transform((s) => (s ?? "").trim())
  .refine((s) => !s || looksLikeWebsite(s), {
    message: "Enter a valid URL or domain.",
  })
  .transform((s) => (s ? externalWebsiteHref(s) : null));

function phoneDigitCount(raw: string): number {
  return raw.replace(/\D/g, "").length;
}

/** Public user submission: one stay listing (+ partner contact if new). */
export const rentalListingSubmissionSchema = z.object({
  _hp_company_website: z.string().max(200).optional(),
  display_name: z.string().trim().min(2).max(120),
  contact_name: z.string().trim().min(2).max(120),
  contact_email: z.string().trim().email().max(200),
  contact_phone: z
    .string()
    .max(40)
    .optional()
    .transform((s) => (s ?? "").trim())
    .refine((s) => !s || (phoneDigitCount(s) >= 7 && phoneDigitCount(s) <= 15), {
      message: "Enter a valid phone number.",
    })
    .transform((s) => s || null),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().min(40).max(20000),
  property_type: z.enum(RENTAL_PROPERTY_TYPES).default("house"),
  town_id: z.string().uuid({ message: "Select a town." }),
  bedrooms: z.coerce.number().min(0).max(30),
  bathrooms: z.coerce.number().min(0).max(30),
  sleeps: z.coerce.number().int().min(1).max(50),
  booking_url: z
    .string()
    .trim()
    .min(1, "Booking URL is required.")
    .max(2000)
    .refine((s) => looksLikeWebsite(s), { message: "Enter a valid booking URL." })
    .transform((s) => externalWebsiteHref(s)!),
  hero_image_url: optionalUrl,
  starting_nightly_rate: z.coerce.number().min(0).max(100000).optional().nullable(),
  beach_access: z.enum(RENTAL_BEACH_ACCESS).optional().nullable(),
  pets_allowed: z.boolean().optional().nullable(),
  private_pool: z.boolean().optional().nullable(),
  gulf_front: z.boolean().optional().nullable(),
  gulf_view: z.boolean().optional().nullable(),
  golf_cart_included: z.boolean().optional().nullable(),
  authority_attested: z.boolean().refine((v) => v === true, {
    message: "Confirm you have authority to list this property.",
  }),
  content_rights_attested: z.boolean().refine((v) => v === true, {
    message: "Confirm rights to use images and descriptions.",
  }),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export type RentalListingSubmission = z.infer<typeof rentalListingSubmissionSchema>;
