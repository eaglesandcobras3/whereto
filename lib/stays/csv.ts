import { createHash } from "crypto";
import { z } from "zod";
import { RENTAL_BEACH_ACCESS, RentalPropertyType, RENTAL_PROPERTY_TYPES } from "@/lib/stays/types";

export const rentalCsvRowSchema = z.object({
  external_id: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(200),
  property_type: z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) => (RENTAL_PROPERTY_TYPES.includes(v as RentalPropertyType) ? v : "other")),
  bedrooms: z.coerce.number().min(0).max(30),
  bathrooms: z.coerce.number().min(0).max(30),
  sleeps: z.coerce.number().int().min(1).max(50),
  town_slug: z.string().trim().min(1).max(120),
  booking_url: z.string().trim().url().max(2000),
  description: z.string().trim().max(20000).optional().or(z.literal("")),
  area_slug: z.string().trim().max(120).optional().or(z.literal("")),
  pets_allowed: z
    .string()
    .optional()
    .transform((v) => parseBool(v)),
  private_pool: z
    .string()
    .optional()
    .transform((v) => parseBool(v)),
  gulf_front: z
    .string()
    .optional()
    .transform((v) => parseBool(v)),
  gulf_view: z
    .string()
    .optional()
    .transform((v) => parseBool(v)),
  beach_access: z
    .string()
    .optional()
    .transform((v) => {
      const t = (v ?? "").trim().toLowerCase();
      return (RENTAL_BEACH_ACCESS as readonly string[]).includes(t) ? t : undefined;
    }),
  golf_cart_included: z
    .string()
    .optional()
    .transform((v) => parseBool(v)),
  parking_notes: z.string().trim().max(2000).optional().or(z.literal("")),
  rules: z.string().trim().max(10000).optional().or(z.literal("")),
  lat: z.coerce.number().optional().or(z.nan()).transform((n) => (Number.isFinite(n) ? n : undefined)),
  lng: z.coerce.number().optional().or(z.nan()).transform((n) => (Number.isFinite(n) ? n : undefined)),
  image_urls: z.string().optional().or(z.literal("")),
  amenities: z.string().optional().or(z.literal("")),
  starting_nightly_rate: z.coerce
    .number()
    .optional()
    .or(z.nan())
    .transform((n) => (Number.isFinite(n) ? n : undefined)),
  pricing_reliable: z
    .string()
    .optional()
    .transform((v) => parseBool(v) === true),
  community_name: z.string().trim().max(200).optional().or(z.literal("")),
  slug: z.string().trim().max(160).optional().or(z.literal("")),
});

export type RentalCsvRow = z.infer<typeof rentalCsvRowSchema>;

function parseBool(v: string | undefined): boolean | undefined {
  if (v == null || v.trim() === "") return undefined;
  const t = v.trim().toLowerCase();
  if (["1", "true", "yes", "y"].includes(t)) return true;
  if (["0", "false", "no", "n"].includes(t)) return false;
  return undefined;
}

/** Minimal CSV parser (handles quoted fields). */
export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = splitCsvLine(lines[0]!).map((h) => h.trim().toLowerCase());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]!);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (cells[idx] ?? "").trim();
    });
    rows.push(row);
  }
  return { headers, rows };
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export function slugifyRentalTitle(title: string, externalId: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const idPart = externalId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return `${base || "stay"}-${idPart || "x"}`;
}

export function rentalFingerprint(input: {
  title: string;
  townSlug: string;
  bedrooms: number;
  externalId: string;
}): string {
  const raw = `${input.externalId}|${input.townSlug}|${input.bedrooms}|${input.title}`
    .toLowerCase()
    .trim();
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

export type ValidatedCsvRow =
  | { ok: true; row: number; data: RentalCsvRow }
  | { ok: false; row: number; errors: string[] };

export function validateCsvRows(rawRows: Record<string, string>[]): ValidatedCsvRow[] {
  return rawRows.map((raw, idx) => {
    const parsed = rentalCsvRowSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false as const,
        row: idx + 2,
        errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      };
    }
    return { ok: true as const, row: idx + 2, data: parsed.data };
  });
}
