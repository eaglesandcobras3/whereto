import { describe, expect, it, vi } from "vitest";
import {
  applySuggestedTagsToPayload,
  suggestionToVocabDescription,
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
    service_category_id: null,
    search_tags: ["wifi"],
    suggested_tags: ["marketing", "product development", "engineering"],
    search_keywords: null,
    marketing_opt_in: false,
    target_business_id: null,
    locations: [],
    ...overrides,
  };
}

function mockSupabase() {
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn(() => ({ upsert }));
  return { supabase: { from } as never, from, upsert };
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

describe("suggestionToVocabDescription", () => {
  it("title-cases readable phrases", () => {
    expect(suggestionToVocabDescription("product development")).toBe("Product Development");
    expect(suggestionToVocabDescription("  marketing  ")).toBe("Marketing");
  });

  it("preserves short all-caps tokens", () => {
    expect(suggestionToVocabDescription("BBQ")).toBe("BBQ");
    expect(suggestionToVocabDescription("HVAC repair")).toBe("HVAC Repair");
  });

  it("formats snake_case input as a label", () => {
    expect(suggestionToVocabDescription("product_strategy")).toBe("Product Strategy");
  });
});

describe("applySuggestedTagsToPayload", () => {
  it("upserts selected tags with description, merges onto search_tags, and links category", async () => {
    const { supabase, from, upsert } = mockSupabase();

    const result = await applySuggestedTagsToPayload(supabase, basePayload(), [
      "marketing",
      "product development",
    ]);

    expect(from).toHaveBeenCalledWith("search_tags_vocabulary");
    expect(from).toHaveBeenCalledWith("search_tag_categories");
    expect(upsert).toHaveBeenNthCalledWith(
      1,
      [
        { tag: "marketing", description: "Marketing" },
        { tag: "product_development", description: "Product Development" },
      ],
      { onConflict: "tag", ignoreDuplicates: true },
    );
    expect(upsert).toHaveBeenNthCalledWith(
      2,
      [
        {
          tag: "marketing",
          category_id: "22222222-2222-4222-8222-222222222222",
        },
        {
          tag: "product_development",
          category_id: "22222222-2222-4222-8222-222222222222",
        },
      ],
      { onConflict: "tag,category_id", ignoreDuplicates: true },
    );
    expect(result.promotedSlugs).toEqual(["marketing", "product_development"]);
    expect(result.payload.search_tags).toEqual(["wifi", "marketing", "product_development"]);
    expect(result.payload.suggested_tags).toEqual(["engineering"]);
  });

  it("skips category linking when category_id is missing", async () => {
    const { supabase, from, upsert } = mockSupabase();

    await applySuggestedTagsToPayload(
      supabase,
      basePayload({ category_id: null }),
      ["marketing"],
    );

    expect(from).toHaveBeenCalledWith("search_tags_vocabulary");
    expect(from).not.toHaveBeenCalledWith("search_tag_categories");
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it("leaves unselected suggestions alone and skips invalid ones", async () => {
    const { supabase } = mockSupabase();

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
    const { supabase } = mockSupabase();

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

  it("supports promote rename, replace, and discard actions", async () => {
    const { supabase, upsert } = mockSupabase();

    const result = await applySuggestedTagsToPayload(supabase, basePayload(), [
      { from: "marketing", action: "promote", to: "digital marketing" },
      { from: "product development", action: "replace", to: "product_strategy" },
      { from: "engineering", action: "discard" },
    ]);

    expect(upsert).toHaveBeenNthCalledWith(
      1,
      [
        { tag: "digital_marketing", description: "Digital Marketing" },
        { tag: "product_strategy", description: "Product Strategy" },
      ],
      { onConflict: "tag", ignoreDuplicates: true },
    );
    expect(result.promotedSlugs).toEqual(["digital_marketing", "product_strategy"]);
    expect(result.payload.search_tags).toEqual([
      "wifi",
      "digital_marketing",
      "product_strategy",
    ]);
    expect(result.payload.suggested_tags).toEqual([]);
  });
});
