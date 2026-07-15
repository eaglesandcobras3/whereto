import { describe, expect, it, vi } from "vitest";
import {
  applySuggestedTagsToPayload,
  suggestionToVocabSlug,
} from "@/lib/listing-requests/apply-suggested-tags";
import type { FreeOnboardPayload } from "@/lib/listing-requests/free-onboard-schema";

function basePayload(overrides: Partial<FreeOnboardPayload> = {}): FreeOnboardPayload {
  return {
    source: "free_onboard",
    submitter_name: "Pat",
    submitter_email: "pat@example.com",
    title: "Acme Marketing",
    is_storefront: false,
    is_service_business: true,
    website: null,
    phone: null,
    excerpt: "A short excerpt for the listing.",
    overview: "A slightly longer overview for visitors.",
    category_id: "22222222-2222-4222-8222-222222222222",
    search_tags: ["wifi"],
    suggested_tags: ["marketing", "product development", "engineering"],
    search_keywords: null,
    marketing_opt_in: false,
    target_business_id: null,
    locations: [],
    ...overrides,
  };
}

describe("suggestionToVocabSlug", () => {
  it("normalizes phrases to snake_case", () => {
    expect(suggestionToVocabSlug("Product Development")).toBe("product_development");
    expect(suggestionToVocabSlug("  marketing  ")).toBe("marketing");
  });

  it("returns null for empty input", () => {
    expect(suggestionToVocabSlug("   ")).toBeNull();
  });
});

describe("applySuggestedTagsToPayload", () => {
  it("upserts selected tags and merges onto search_tags", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const supabase = {
      from: vi.fn(() => ({ upsert })),
    } as never;

    const result = await applySuggestedTagsToPayload(supabase, basePayload(), [
      "marketing",
      "product development",
    ]);

    expect(upsert).toHaveBeenCalledWith(
      [{ tag: "marketing" }, { tag: "product_development" }],
      { onConflict: "tag", ignoreDuplicates: true },
    );
    expect(result.promotedSlugs).toEqual(["marketing", "product_development"]);
    expect(result.payload.search_tags).toEqual(["wifi", "marketing", "product_development"]);
    expect(result.payload.suggested_tags).toEqual(["engineering"]);
  });

  it("leaves unselected suggestions alone and skips invalid ones", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const supabase = {
      from: vi.fn(() => ({ upsert })),
    } as never;

    const result = await applySuggestedTagsToPayload(
      supabase,
      basePayload({
        suggested_tags: ["marketing", "!!!", "engineering"],
      }),
      ["marketing", "!!!"],
    );

    expect(result.promotedSlugs).toEqual(["marketing"]);
    expect(result.skippedInvalid).toEqual(["!!!"]);
    expect(result.payload.suggested_tags).toEqual(["!!!", "engineering"]);
  });

  it("respects the six-tag cap", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const supabase = {
      from: vi.fn(() => ({ upsert })),
    } as never;

    const result = await applySuggestedTagsToPayload(
      supabase,
      basePayload({
        search_tags: ["a", "b", "c", "d", "e"],
        suggested_tags: ["marketing", "engineering"],
      }),
      ["marketing", "engineering"],
    );

    expect(result.payload.search_tags).toHaveLength(6);
    expect(result.payload.search_tags).toContain("marketing");
    expect(result.payload.suggested_tags).toContain("engineering");
  });
});
