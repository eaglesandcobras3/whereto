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
    is_explorable: false,
    search_keywords: null,
    marketing_opt_in: false,
    target_business_id: null,
    locations: [],
    ...overrides,
  };
}

function mockCategoryClient(opts: {
  bySlug?: { id: string; title: string; parent_category_id: string | null } | null;
  byId?: { id: string; title: string; parent_category_id: string | null } | null;
  created?: { id: string; title: string };
}) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: opts.bySlug !== undefined ? opts.bySlug : opts.byId ?? null,
  });
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
    select: vi.fn(() => ({ single })),
  };
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => selectChain),
      insert: vi.fn(() => insertChain),
    })),
  };
}

describe("applySuggestedCategoryToPayload", () => {
  it("creates a leaf under a rollup and clears the suggestion", async () => {
    const supabase = mockCategoryClient({
      bySlug: null,
      created: { id: "cat-1", title: "Kayak rentals" },
    });

    const result = await applySuggestedCategoryToPayload(supabase as never, basePayload(), {
      mode: "create",
      title: "Kayak rentals",
      parentCategoryId: "rollup-1",
    });

    expect(result.created).toBe(true);
    expect(result.categoryId).toBe("cat-1");
    expect(result.payload.category_id).toBe("cat-1");
    expect(result.payload.suggested_category).toBeNull();
  });

  it("reuses an existing leaf slug instead of inserting", async () => {
    const supabase = mockCategoryClient({
      bySlug: { id: "existing", title: "Kayak rentals", parent_category_id: "rollup-1" },
    });

    const result = await applySuggestedCategoryToPayload(supabase as never, basePayload(), {
      mode: "create",
      title: "Kayak rentals",
      parentCategoryId: "rollup-1",
    });

    expect(result.created).toBe(false);
    expect(result.categoryId).toBe("existing");
  });

  it("maps to an existing leaf id", async () => {
    const supabase = mockCategoryClient({
      byId: { id: "picked", title: "Restaurants", parent_category_id: "rollup-1" },
    });

    const result = await applySuggestedCategoryToPayload(supabase as never, basePayload(), {
      mode: "existing",
      categoryId: "picked",
    });

    expect(result.payload.category_id).toBe("picked");
    expect(result.payload.suggested_category).toBeNull();
  });

  it("rejects rollup-only ids as existing category", async () => {
    const supabase = mockCategoryClient({
      byId: { id: "rollup", title: "Food & Drink", parent_category_id: null },
    });

    await expect(
      applySuggestedCategoryToPayload(supabase as never, basePayload(), {
        mode: "existing",
        categoryId: "rollup",
      }),
    ).rejects.toThrow(/valid existing category/i);
  });
});
