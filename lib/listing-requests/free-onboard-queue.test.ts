import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createFreeListingForLocation } from "@/lib/listing-requests/free-onboard-queue";
import { FREE_ONBOARD_TYPES } from "@/lib/listing-requests/free-onboard-schema";

vi.mock("@/lib/listing-requests/free-onboard-notify", () => ({
  sendFreeOnboardSubmitterEmail: vi.fn(async () => undefined),
}));

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type InsertCapture = { table: string; row: Record<string, unknown> };

function mockApproveSupabase(payload: Record<string, unknown>) {
  const inserts: InsertCapture[] = [];
  let reviewPayload = structuredClone(payload);

  const item = {
    id: "review-1",
    type: FREE_ONBOARD_TYPES.newListing,
    status: "pending",
    payload: reviewPayload,
  };

  const supabase = {
    from(table: string) {
      if (table === "portal_review_items") {
        return {
          select() {
            return {
              eq() {
                return {
                  async maybeSingle() {
                    return { data: { ...item, payload: reviewPayload }, error: null };
                  },
                };
              },
            };
          },
          update(patch: Record<string, unknown>) {
            if (patch.payload) reviewPayload = patch.payload as Record<string, unknown>;
            return {
              async eq() {
                return { error: null };
              },
            };
          },
        };
      }

      if (table === "towns") {
        return {
          select() {
            return {
              eq() {
                return {
                  async maybeSingle() {
                    return {
                      data: {
                        id: "11111111-1111-4111-8111-111111111111",
                        title: "Seaside",
                        slug: "seaside",
                      },
                      error: null,
                    };
                  },
                };
              },
            };
          },
        };
      }

      if (table === "businesses") {
        return {
          async select() {
            return { data: [], error: null };
          },
          insert(row: Record<string, unknown>) {
            inserts.push({ table, row });
            return {
              select() {
                return {
                  async single() {
                    if (row.id == null) {
                      return {
                        data: null,
                        error: {
                          message:
                            'null value in column "id" of relation "businesses" violates not-null constraint',
                        },
                      };
                    }
                    return {
                      data: { id: row.id, slug: row.slug },
                      error: null,
                    };
                  },
                };
              },
            };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };

  return { supabase: supabase as unknown as SupabaseClient, inserts };
}

describe("createFreeListingForLocation", () => {
  it("inserts businesses with a client-generated UUID id (no DB default)", async () => {
    const locationId = "loc-1";
    const payload = {
      source: "free_onboard",
      submitter_name: "Pat",
      submitter_email: "pat@example.com",
      title: "Amavida Coffee",
      is_storefront: true,
      is_service_business: false,
      website: "https://example.com",
      phone: "850-555-0100",
      excerpt: "Coffee near the beach.",
      overview: "A local coffee shop with great espresso.",
      category_id: "22222222-2222-4222-8222-222222222222",
      search_tags: ["coffee"],
      suggested_tags: [],
      search_keywords: "espresso",
      marketing_opt_in: true,
      locations: [
        {
          id: locationId,
          town_id: "11111111-1111-4111-8111-111111111111",
          address: "1 Main St",
          status: "pending",
        },
      ],
    };

    const { supabase, inserts } = mockApproveSupabase(payload);
    const result = await createFreeListingForLocation(
      supabase,
      "review-1",
      locationId,
      "admin-1",
      { deferNotify: true },
    );

    const businessInsert = inserts.find((i) => i.table === "businesses");
    expect(businessInsert).toBeDefined();
    expect(businessInsert!.row.id).toEqual(expect.stringMatching(UUID_RE));
    expect(result.businessId).toBe(businessInsert!.row.id);
    expect(result.businessSlug).toMatch(/^amavida-coffee/);
  });
});
