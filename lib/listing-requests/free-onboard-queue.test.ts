import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  approveAllFreeLocations,
  approveFreeUpdate,
  createFreeListingForLocation,
} from "@/lib/listing-requests/free-onboard-queue";
import { FREE_ONBOARD_TYPES } from "@/lib/listing-requests/free-onboard-schema";

vi.mock("@/lib/listing-requests/free-onboard-notify", () => ({
  sendFreeOnboardSubmitterEmail: vi.fn(async () => undefined),
}));

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type InsertCapture = { table: string; row: Record<string, unknown> };
type UpdateCapture = { table: string; row: Record<string, unknown>; id?: string };

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

function mockUpdateApproveSupabase(opts: {
  payload: Record<string, unknown>;
  existing: {
    id: string;
    slug: string;
    title: string;
    town_id: string;
    search_keywords: string | null;
  };
}) {
  const updates: UpdateCapture[] = [];
  let reviewPayload = structuredClone(opts.payload);
  let reviewStatus = "pending";
  const businessId = opts.existing.id;

  const item = {
    id: "review-1",
    type: FREE_ONBOARD_TYPES.update,
    status: "pending",
    business_id: businessId,
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
                        id: opts.existing.town_id,
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
          select() {
            return {
              eq() {
                return {
                  async maybeSingle() {
                    return { data: { ...opts.existing }, error: null };
                  },
                };
              },
            };
          },
          update(row: Record<string, unknown>) {
            return {
              async eq(_col: string, id: string) {
                updates.push({ table, row, id });
                return { error: null };
              },
            };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };

  return { supabase: supabase as unknown as SupabaseClient, updates };
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
    expect(businessInsert!.row.is_verified).toBe(true);
    expect(result.businessId).toBe(businessInsert!.row.id);
    expect(result.businessSlug).toMatch(/^amavida-coffee/);
  });

  it("does not mark verified when the intake was submitted by an admin", async () => {
    const locationId = "loc-1";
    const payload = {
      source: "free_onboard",
      submitter_name: "Admin",
      submitter_email: "admin@whereto30a.com",
      submitted_by_admin: true,
      title: "Admin Seed Cafe",
      is_storefront: true,
      is_service_business: false,
      website: "https://example.com",
      phone: "850-555-0100",
      excerpt: "Seeded listing.",
      overview: "Admin-created copy.",
      category_id: "22222222-2222-4222-8222-222222222222",
      search_tags: ["coffee"],
      suggested_tags: [],
      search_keywords: "espresso",
      marketing_opt_in: false,
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
    await createFreeListingForLocation(supabase, "review-1", locationId, "admin-1", {
      deferNotify: true,
    });

    const businessInsert = inserts.find((i) => i.table === "businesses");
    expect(businessInsert!.row.is_verified).toBe(false);
  });
});

describe("approveAllFreeLocations service-only", () => {
  it("creates a town-less listing with primary_category_id for browse discovery", async () => {
    const categoryId = "44444444-4444-4444-8444-444444444444";
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
      category_id: categoryId,
      category_title: "Financial Services",
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
    expect(businessInsert!.row.primary_category_id).toBe(categoryId);
    expect(businessInsert!.row.service_category_id).toBeNull();
  });
});

describe("approveFreeUpdate search_keywords", () => {
  const businessId = "33333333-3333-4333-8333-333333333333";
  const townId = "11111111-1111-4111-8111-111111111111";

  function basePayload() {
    return {
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
      category_title: "Coffee shops",
      search_tags: ["coffee"],
      suggested_tags: [],
      search_keywords: null,
      marketing_opt_in: false,
      target_business_id: businessId,
      locations: [
        {
          id: "loc-1",
          town_id: townId,
          address: "1 Main St",
          status: "pending",
        },
      ],
    };
  }

  const existing = {
    id: businessId,
    slug: "amavida-coffee-seaside",
    title: "Amavida Coffee",
    town_id: townId,
    search_keywords: "espresso, seaside coffee",
  };

  it("writes generated search_keywords from name, type, category, and tags", async () => {
    const { supabase, updates } = mockUpdateApproveSupabase({
      payload: basePayload(),
      existing,
    });

    await approveFreeUpdate(supabase, "review-1", "admin-1");

    const businessUpdate = updates.find((u) => u.table === "businesses");
    expect(businessUpdate).toBeDefined();
    expect(businessUpdate!.row.search_keywords).toBe(
      "Amavida Coffee, local business, Coffee shops, Coffee shops on 30A, Coffee",
    );
  });

  it("keeps existing search_keywords only when generation has nothing to write", async () => {
    const { supabase, updates } = mockUpdateApproveSupabase({
      payload: {
        ...basePayload(),
        title: "",
        is_storefront: false,
        is_service_business: false,
        category_title: null,
        search_tags: [],
      },
      existing,
    });

    await approveFreeUpdate(supabase, "review-1", "admin-1");

    const businessUpdate = updates.find((u) => u.table === "businesses");
    expect(businessUpdate).toBeDefined();
    expect(businessUpdate!.row.search_keywords).toBe("espresso, seaside coffee");
  });

  it("does not write image URL columns even when main_image_url is in the payload", async () => {
    const { supabase, updates } = mockUpdateApproveSupabase({
      payload: {
        ...basePayload(),
        main_image_url: "https://cdn.example.com/hero.webp",
      },
      existing,
    });

    await approveFreeUpdate(supabase, "review-1", "admin-1");

    const businessUpdate = updates.find((u) => u.table === "businesses");
    expect(businessUpdate).toBeDefined();
    expect(businessUpdate!.row).not.toHaveProperty("main_image_url");
    expect(businessUpdate!.row).not.toHaveProperty("hero_image_url");
  });

  it("updates address on the target business without inserting a new listing", async () => {
    const { supabase, updates } = mockUpdateApproveSupabase({
      payload: {
        ...basePayload(),
        locations: [
          {
            id: "loc-1",
            town_id: townId,
            address: "99 New Ave",
            status: "pending",
          },
        ],
      },
      existing,
    });

    await approveFreeUpdate(supabase, "review-1", "admin-1");

    const businessUpdate = updates.find((u) => u.table === "businesses");
    expect(businessUpdate).toBeDefined();
    expect(businessUpdate!.id).toBe(businessId);
    expect(businessUpdate!.row.town_id).toBe(townId);
    expect(businessUpdate!.row.address).toBe("99 New Ave");
    expect(businessUpdate!.row.is_verified).toBe(true);
    expect(updates.filter((u) => u.table === "businesses")).toHaveLength(1);
  });

  it("does not set is_verified when the update was submitted by an admin", async () => {
    const { supabase, updates } = mockUpdateApproveSupabase({
      payload: {
        ...basePayload(),
        submitted_by_admin: true,
        locations: [
          {
            id: "loc-1",
            town_id: townId,
            address: "99 New Ave",
            status: "pending",
          },
        ],
      },
      existing,
    });

    await approveFreeUpdate(supabase, "review-1", "admin-1");

    const businessUpdate = updates.find((u) => u.table === "businesses");
    expect(businessUpdate).toBeDefined();
    expect(businessUpdate!.row).not.toHaveProperty("is_verified");
  });

  it("skips extra locations instead of creating sibling listings", async () => {
    const { supabase, updates } = mockUpdateApproveSupabase({
      payload: {
        ...basePayload(),
        locations: [
          {
            id: "loc-1",
            town_id: townId,
            address: "1 Main St",
            status: "pending",
          },
          {
            id: "loc-2",
            town_id: townId,
            address: "2 Side St",
            status: "pending",
          },
        ],
      },
      existing,
    });

    await approveFreeUpdate(supabase, "review-1", "admin-1");

    expect(updates.filter((u) => u.table === "businesses")).toHaveLength(1);
    expect(updates.find((u) => u.table === "businesses")!.row.address).toBe("1 Main St");
  });
});

describe("createFreeListingForLocation on update", () => {
  it("rejects per-location create so updates cannot spawn duplicate listings", async () => {
    const locationId = "loc-1";
    const businessId = "33333333-3333-4333-8333-333333333333";
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
      marketing_opt_in: false,
      target_business_id: businessId,
      locations: [
        {
          id: locationId,
          town_id: "11111111-1111-4111-8111-111111111111",
          address: "1 Main St",
          status: "pending",
        },
      ],
    };

    const { supabase } = mockUpdateApproveSupabase({
      payload,
      existing: {
        id: businessId,
        slug: "amavida-coffee-seaside",
        title: "Amavida Coffee",
        town_id: "11111111-1111-4111-8111-111111111111",
        search_keywords: null,
      },
    });

    await expect(
      createFreeListingForLocation(supabase, "review-1", locationId, "admin-1"),
    ).rejects.toThrow(/Approve an update to change the existing listing/);
  });
});
