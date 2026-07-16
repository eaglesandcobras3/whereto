import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  approveAllFreeLocations,
  createFreeListingForLocation,
} from "@/lib/listing-requests/free-onboard-queue";
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
  let reviewStatus = "pending";

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
                    return {
                      data: {
                        ...item,
                        status: reviewStatus,
                        payload: reviewPayload,
                      },
                      error: null,
                    };
                  },
                };
              },
            };
          },
          update(patch: Record<string, unknown>) {
            if (patch.payload) reviewPayload = patch.payload as Record<string, unknown>;
            if (typeof patch.status === "string") reviewStatus = patch.status;
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
    expect(businessInsert!.row.primary_category_id).toBe(payload.category_id);
    expect(businessInsert!.row.service_category_id).toBeNull();
    expect(result.businessId).toBe(businessInsert!.row.id);
    expect(result.businessSlug).toMatch(/^amavida-coffee/);
  });
});

describe("approveAllFreeLocations service-only", () => {
  it("creates a town-less listing with service_category_id for browse discovery", async () => {
    const specialtyId = "44444444-4444-4444-8444-444444444444";
    const payload = {
      source: "free_onboard",
      submitter_name: "Pat",
      submitter_email: "pat@example.com",
      title: "Coastal CPA",
      is_storefront: false,
      is_service_business: true,
      website: "https://example.com",
      phone: "850-555-0199",
      excerpt: "Tax and bookkeeping for local businesses.",
      overview: "Regional accounting by appointment.",
      category_id: null,
      service_category_id: specialtyId,
      service_category_title: "Accounting & tax",
      search_tags: ["accounting"],
      suggested_tags: [],
      search_keywords: "cpa",
      marketing_opt_in: false,
      locations: [],
    };

    const { supabase, inserts } = mockApproveSupabase(payload);
    const result = await approveAllFreeLocations(supabase, "review-1", "admin-1");

    expect(result.created).toBe(1);
    const businessInsert = inserts.find((i) => i.table === "businesses");
    expect(businessInsert).toBeDefined();
    expect(businessInsert!.row.is_service_business).toBe(true);
    expect(businessInsert!.row.is_storefront).toBe(false);
    expect(businessInsert!.row.town_id).toBeNull();
    expect(businessInsert!.row.primary_category_id).toBeNull();
    expect(businessInsert!.row.service_category_id).toBe(specialtyId);
  });
});
