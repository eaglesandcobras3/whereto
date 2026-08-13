import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  LISTING_FIELD_FLAG_ENTITIES,
  LISTING_FIELD_FLAG_FIELDS,
} from "@/lib/listing-requests/listing-field-flag";

/** Mirrors `app/api/listing-field-flags/route.ts` body schema (kept local to avoid route imports). */
const bodySchema = z.object({
  entity: z.enum(LISTING_FIELD_FLAG_ENTITIES).default("business"),
  entity_id: z.string().uuid().optional(),
  business_id: z.string().uuid().optional(),
  field: z.enum(LISTING_FIELD_FLAG_FIELDS),
  note: z
    .string()
    .max(500)
    .optional()
    .transform((s) => {
      const t = (s ?? "").trim();
      return t || null;
    }),
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
});

describe("listing-field-flags body schema", () => {
  it("accepts a note-only report without email (client no longer sends email)", () => {
    const parsed = bodySchema.safeParse({
      entity: "business",
      entity_id: "00000000-0000-4000-8000-000000000001",
      field: "essentials",
      note: "Wrong phone number",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.note).toBe("Wrong phone number");
    expect(parsed.data.reporter_email).toBeNull();
  });

  it("accepts an empty optional note", () => {
    const parsed = bodySchema.safeParse(
      JSON.parse(
        JSON.stringify({
          entity: "business",
          entity_id: "00000000-0000-4000-8000-000000000001",
          field: "description",
          note: undefined,
        }),
      ),
    );
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.note).toBeNull();
  });

  it("rejects autofilled invalid reporter_email with a clear message", () => {
    const parsed = bodySchema.safeParse({
      entity: "business",
      entity_id: "00000000-0000-4000-8000-000000000001",
      field: "essentials",
      reporter_email: "Name From Autofill",
    });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const fieldErrors = parsed.error.flatten().fieldErrors;
    expect(fieldErrors.reporter_email?.[0]).toBe("Enter a valid email.");
  });
});
