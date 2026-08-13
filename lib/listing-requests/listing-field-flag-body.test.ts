import { describe, expect, it } from "vitest";
import { listingFieldFlagBodySchema } from "@/lib/listing-requests/listing-field-flag";

describe("listing-field-flags body schema", () => {
  it("accepts header + short note (client default section)", () => {
    const parsed = listingFieldFlagBodySchema.safeParse({
      entity: "business",
      entity_id: "00000000-0000-4000-8000-000000000001",
      field: "header",
      note: "test",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts a note-only report without email (client no longer sends email)", () => {
    const parsed = listingFieldFlagBodySchema.safeParse({
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
    const parsed = listingFieldFlagBodySchema.safeParse(
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
    const parsed = listingFieldFlagBodySchema.safeParse({
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

  it("accepts a missing-business suggestion on a town section without email", () => {
    const parsed = listingFieldFlagBodySchema.safeParse({
      entity: "town",
      entity_id: "00000000-0000-4000-8000-000000000001",
      field: "listings",
      note: "Add Bud & Alley’s",
      section: "Food & drink",
      page_title: "Seaside",
      page_slug: "seaside",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.section).toBe("Food & drink");
  });

  it("accepts a hub suggestion without entity_id (guides / businesses hub)", () => {
    const parsed = listingFieldFlagBodySchema.safeParse({
      entity: "hub",
      field: "guides",
      note: "Need a rainy-day guide",
      page_title: "Travel guides",
      page_slug: "guides",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts a category suggestion on a rollup", () => {
    const parsed = listingFieldFlagBodySchema.safeParse({
      entity: "category",
      entity_id: "00000000-0000-4000-8000-000000000001",
      field: "categories",
      note: "Add gelato shops",
      section: "Food & drink",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts a missing-area suggestion on a town page", () => {
    const parsed = listingFieldFlagBodySchema.safeParse({
      entity: "town",
      entity_id: "00000000-0000-4000-8000-000000000001",
      field: "areas",
      note: "Add Alys Beach",
      page_title: "Seaside",
      page_slug: "seaside",
    });
    expect(parsed.success).toBe(true);
  });
});
