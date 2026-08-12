import { z } from "zod";
import { externalWebsiteHref } from "@/lib/urls/external-website-href";
import { RENTAL_IMPORT_METHODS } from "@/lib/stays/types";

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

const optionalWebsite = z
  .string()
  .max(500)
  .optional()
  .transform((s) => (s ?? "").trim())
  .refine((s) => !s || looksLikeWebsite(s), {
    message: "Enter a valid website URL or domain.",
  })
  .transform((s) => (s ? externalWebsiteHref(s) : null));

function phoneDigitCount(raw: string): number {
  return raw.replace(/\D/g, "").length;
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

export const rentalPartnerApplicationSchema = z
  .object({
    _hp_company_website: z.string().max(200).optional(),
    /** Optional public directory listing link. */
    business_id: z.string().uuid().optional().nullable(),
    business_slug: z.string().trim().max(160).optional().nullable(),
    /** Org/brand name for ops — does not require a public business page. */
    display_name: z.string().trim().min(2).max(120),
    /** Legacy alias accepted from older clients; maps to display_name. */
    business_title: z.string().trim().max(120).optional().nullable(),
    link_public_business: z.boolean().optional().default(false),
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
    pms_name: optionalTrimmed,
    pms_other: optionalTrimmed,
    booking_engine_base_url: optionalWebsite,
    booking_url_template: z.string().trim().max(2000).optional().nullable(),
    portfolio_size: z.coerce.number().int().min(1).max(5000).optional().nullable(),
    towns_served: z.string().trim().max(500).optional().nullable(),
    import_method: z.enum(RENTAL_IMPORT_METHODS).default("manual"),
    authority_attested: z.boolean().refine((v) => v === true, {
      message: "Confirm you have authority to list these properties.",
    }),
    content_rights_attested: z.boolean().refine((v) => v === true, {
      message: "Confirm rights to use images and descriptions.",
    }),
    notes: z.string().trim().max(2000).optional().nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.link_public_business && !v.business_id && !v.business_slug) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add a business slug or ID to link a public company profile, or leave linking off.",
        path: ["business_slug"],
      });
    }
  });

export type RentalPartnerApplication = z.infer<typeof rentalPartnerApplicationSchema>;
