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

export const rentalPartnerApplicationSchema = z
  .object({
    _hp_company_website: z.string().max(200).optional(),
    business_id: z.string().uuid().optional().nullable(),
    business_slug: z.string().trim().max(160).optional().nullable(),
    business_title: z.string().trim().min(2).max(120),
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
    pms_name: z.string().trim().max(120).optional().nullable(),
    pms_other: z.string().trim().max(120).optional().nullable(),
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
  .refine((v) => Boolean(v.business_id || v.business_slug || v.business_title), {
    message: "Business is required",
  });

export type RentalPartnerApplication = z.infer<typeof rentalPartnerApplicationSchema>;
