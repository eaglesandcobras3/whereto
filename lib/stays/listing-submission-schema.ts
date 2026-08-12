import { z } from "zod";
import { RENTAL_LISTING_MAX_PHOTOS } from "@/lib/stays/constants";
import { externalWebsiteHref } from "@/lib/urls/external-website-href";
import {
  RENTAL_BEACH_ACCESS,
  RENTAL_LOCATION_PRECISION,
  RENTAL_PROPERTY_TYPES,
} from "@/lib/stays/types";

export { RENTAL_LISTING_MAX_PHOTOS };

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

const optionalTrimmed = z
  .string()
  .max(200)
  .optional()
  .nullable()
  .transform((s) => {
    const t = (s ?? "").trim();
    return t || null;
  });

function phoneDigitCount(raw: string): number {
  return raw.replace(/\D/g, "").length;
}

const optionalNumber = z.preprocess((v) => {
  if (v === "" || v == null) return null;
  return v;
}, z.coerce.number().nullable().optional());

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
  community_name: optionalTrimmed,
  street_address: optionalTrimmed,
  postal_code: z
    .string()
    .max(20)
    .optional()
    .nullable()
    .transform((s) => {
      const t = (s ?? "").trim();
      return t || null;
    }),
  map_lat: optionalNumber.refine((n) => n == null || (n >= -90 && n <= 90), {
    message: "Latitude must be between -90 and 90.",
  }),
  map_lng: optionalNumber.refine((n) => n == null || (n >= -180 && n <= 180), {
    message: "Longitude must be between -180 and 180.",
  }),
  location_precision: z.enum(RENTAL_LOCATION_PRECISION).default("approximate"),
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
  starting_nightly_rate: optionalNumber.refine((n) => n == null || (n >= 0 && n <= 100000), {
    message: "Enter a valid nightly rate.",
  }),
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

/** Parse multipart or JSON body fields into a plain object for Zod. */
export function listingFieldsFromFormData(fd: FormData): Record<string, unknown> {
  const bool = (name: string) => {
    const v = fd.get(name);
    return v === "on" || v === "true" || v === "1";
  };
  return {
    _hp_company_website: String(fd.get("_hp_company_website") ?? ""),
    display_name: String(fd.get("display_name") ?? ""),
    contact_name: String(fd.get("contact_name") ?? ""),
    contact_email: String(fd.get("contact_email") ?? ""),
    contact_phone: String(fd.get("contact_phone") ?? ""),
    title: String(fd.get("title") ?? ""),
    description: String(fd.get("description") ?? ""),
    property_type: String(fd.get("property_type") ?? "house"),
    town_id: String(fd.get("town_id") ?? ""),
    community_name: String(fd.get("community_name") ?? "") || null,
    street_address: String(fd.get("street_address") ?? "") || null,
    postal_code: String(fd.get("postal_code") ?? "") || null,
    map_lat: String(fd.get("map_lat") ?? ""),
    map_lng: String(fd.get("map_lng") ?? ""),
    location_precision: String(fd.get("location_precision") ?? "approximate"),
    bedrooms: String(fd.get("bedrooms") ?? "1"),
    bathrooms: String(fd.get("bathrooms") ?? "1"),
    sleeps: String(fd.get("sleeps") ?? "2"),
    booking_url: String(fd.get("booking_url") ?? ""),
    starting_nightly_rate: String(fd.get("starting_nightly_rate") ?? ""),
    beach_access: String(fd.get("beach_access") ?? "unknown"),
    pets_allowed: bool("pets_allowed"),
    private_pool: bool("private_pool"),
    gulf_front: bool("gulf_front"),
    gulf_view: bool("gulf_view"),
    golf_cart_included: bool("golf_cart_included"),
    authority_attested: bool("authority_attested"),
    content_rights_attested: bool("content_rights_attested"),
    notes: String(fd.get("notes") ?? "") || null,
  };
}

export function listingPhotoFilesFromFormData(fd: FormData): File[] {
  const main = fd.get("photo_main");
  const mainFile = main instanceof File && main.size > 0 ? main : null;
  const additional = fd
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0);
  const files = mainFile ? [mainFile, ...additional] : additional;
  return files.slice(0, RENTAL_LISTING_MAX_PHOTOS);
}
