import { describe, expect, it, vi } from "vitest";
import { applySuggestedCategoryToPayload } from "@/lib/listing-requests/apply-suggested-category";
import type { FreeOnboardPayload } from "@/lib/listing-requests/free-onboard-schema";

function basePayload(overrides: Partial<FreeOnboardPayload> = {}): FreeOnboardPayload {
  return {
    source: "free_onboard",
    submitter_name: "Pat",
    submitter_email: "pat@example.com",
    title: "Coastal Kayaks",
    is_storefront: true,
    is_service_business: false,
    website: null,
    phone: null,
    excerpt: "A short excerpt for the listing.",
    overview: "A slightly longer overview for visitors.",
    category_id: null,
    category_title: null,
    service_category_id: null,
    service_category_title: null,
    search_tags: [],
    suggested_tags: [],
    suggested_category: "Kayak rentals",
    search_keywords: null,
    marketing_opt_in: false,
    target_business_id: null,
    locations: [],
    ...overrides,
  };
}

function mockCategoryClient(opts: {
  bySlug?: { id: string; title: string } | null;
  byId?: { id: string; title: string } | null;
  created?: { id: string; title: string };
}) {
  const maybeSingle = vi.fn();
  // First call: find by slug (create path) or by id (existing path)
  maybeSingle.mockResolvedValueOnce({
    data: opts.bySlug !== undefined ? opts.bySlug : opts.byId ?? null,
  });
  if (opts.bySlug === null && opts.created) {
    // insert path uses .insert().select().single()
  }

  const single = vi.fn().mockResolvedValue({
    data: opts.created ?? null,
    error: opts.created ? null : { message: "insert failed" },
  });

  const selectChain = {
    eq: vi.fn(() => selectChain),
    is: vi.fn(() => selectChain),
    maybeSingle,
  };

  const insertChain = {
    select: vi.fn(() => ({
      single,
    })),
  };

  return {
    from: vi.fn(() => ({
      select: vi.fn(() => selectChain),
      insert: vi.fn(() => insertChain),
    })),
    _maybeSingle: maybeSingle,
    _single: single,
  };
}

describe("applySuggestedCategoryToPayload", () => {
  it("creates a storefront category and clears the suggestion", async () => {
    const supabase = mockCategoryClient({
      bySlug: null,
      created: { id: "cat-1", title: "Kayak rentals" },
    });

    const result = await applySuggestedCategoryToPayload(supabase as never, basePayload(), {
      mode: "create",
      title: "Kayak rentals",
    });

    expect(result.created).toBe(true);
    expect(result.categoryId).toBe("cat-1");
    expect(result.payload.category_id).toBe("cat-1");
    expect(result.payload.category_title).toBe("Kayak rentals");
    expect(result.payload.suggested_category).toBeNull();
  });

  it("reuses an existing slug instead of inserting", async () => {
    const supabase = mockCategoryClient({
      bySlug: { id: "existing", title: "Kayak rentals" },
    });

    const result = await applySuggestedCategoryToPayload(supabase as never, basePayload(), {
      mode: "create",
      title: "Kayak rentals",
    });

    expect(result.created).toBe(false);
    expect(result.categoryId).toBe("existing");
    expect(result.payload.category_id).toBe("existing");
  });

  it("maps to an existing category id", async () => {
    const supabase = mockCategoryClient({
      byId: { id: "picked", title: "Things to do" },
    });

    const result = await applySuggestedCategoryToPayload(supabase as never, basePayload(), {
      mode: "existing",
      categoryId: "picked",
    });

    expect(result.created).toBe(false);
    expect(result.payload.category_id).toBe("picked");
    expect(result.payload.category_title).toBe("Things to do");
    expect(result.payload.suggested_category).toBeNull();
  });

  it("writes service specialty fields for service intakes", async () => {
    const supabase = mockCategoryClient({
      bySlug: null,
      created: { id: "svc-1", title: "Yacht detailing" },
    });

    const result = await applySuggestedCategoryToPayload(
      supabase as never,
      basePayload({
        is_storefront: false,
        is_service_business: true,
        suggested_category: "Yacht detailing",
      }),
      { mode: "create", title: "Yacht detailing" },
    );

    expect(result.payload.service_category_id).toBe("svc-1");
    expect(result.payload.service_category_title).toBe("Yacht detailing");
    expect(result.payload.category_id).toBeNull();
  });
});
