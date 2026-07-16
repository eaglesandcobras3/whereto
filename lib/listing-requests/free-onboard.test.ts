import { describe, expect, it } from "vitest";
import {
  buildFreeOnboardSearchKeywords,
  buildFreeOnboardSeoDescription,
  buildFreeOnboardSeoTitle,
  buildFreeOnboardSlug,
} from "@/lib/listing-requests/free-onboard-derived";
import {
  FREE_ONBOARD_EXCERPT_MAX,
  FREE_ONBOARD_OVERVIEW_MAX,
  FREE_ONBOARD_SEARCH_KEYWORDS_MAX,
  FREE_ONBOARD_SEARCH_TAGS_MAX,
  FREE_ONBOARD_TITLE_MAX,
  freeOnboardBodySchema,
  freeOnboardRemovalBodySchema,
  parseSuggestedTagsInput,
} from "@/lib/listing-requests/free-onboard-schema";
import {
  isFreeOnboardEnabled,
  isOnboardEnabled,
  isReviewQueueEnabled,
  resolveFeatureFlags,
} from "@/lib/feature-flags-core";

describe("free onboard flags", () => {
  it("defaults free_onboard off", () => {
    const flags = resolveFeatureFlags({});
    expect(isFreeOnboardEnabled(flags)).toBe(false);
    expect(isReviewQueueEnabled(flags)).toBe(false);
  });

  it("enables review queue with free_onboard alone", () => {
    const flags = resolveFeatureFlags({ free_onboard: true });
    expect(isFreeOnboardEnabled(flags)).toBe(true);
    expect(isOnboardEnabled(flags)).toBe(false);
    expect(isReviewQueueEnabled(flags)).toBe(true);
  });

  it("keeps review queue on when either flag is on", () => {
    expect(isReviewQueueEnabled(resolveFeatureFlags({ onboard: true }))).toBe(true);
    expect(
      isReviewQueueEnabled(resolveFeatureFlags({ onboard: true, free_onboard: true })),
    ).toBe(true);
  });
});

describe("free onboard derived fields", () => {
  it("builds seo title from title and town", () => {
    expect(buildFreeOnboardSeoTitle("Amavida", "Seaside")).toBe("Amavida | Seaside");
  });

  it("caps seo description to excerpt max", () => {
    const long = "x".repeat(200);
    expect(buildFreeOnboardSeoDescription(long)).toHaveLength(FREE_ONBOARD_EXCERPT_MAX);
  });

  it("builds unique slug from title and town", () => {
    const taken = new Set<string>(["amavida-seaside"]);
    expect(buildFreeOnboardSlug("Amavida", "seaside", taken)).toBe("amavida-seaside-2");
  });

  it("builds search keywords from name, type, category, and tags", () => {
    expect(
      buildFreeOnboardSearchKeywords({
        title: "Amavida Coffee",
        isStorefront: true,
        isServiceBusiness: false,
        categoryTitle: "Coffee shops",
        searchTags: ["coffee", "wifi"],
        suggestedTags: ["local_roast"],
      }),
    ).toBe(
      "Amavida Coffee, local business, Coffee shops, Coffee shops on 30A, Coffee, Wifi, Local Roast",
    );
  });

  it("uses service specialty wording for service businesses", () => {
    expect(
      buildFreeOnboardSearchKeywords({
        title: "Coastal CPA",
        isStorefront: false,
        isServiceBusiness: true,
        serviceCategoryTitle: "Accounting & tax",
        searchTags: ["accounting"],
      }),
    ).toBe(
      "Coastal CPA, service provider, Accounting & tax, Accounting & tax on 30A, Accounting",
    );
  });

  it("caps generated search keywords to the max length", () => {
    const keywords = buildFreeOnboardSearchKeywords({
      title: "A".repeat(80),
      isStorefront: true,
      isServiceBusiness: false,
      categoryTitle: "B".repeat(80),
      searchTags: Array.from({ length: 6 }, (_, i) => `tag_${i}_${"x".repeat(40)}`),
    });
    expect(keywords).toBeTruthy();
    expect(keywords!.length).toBeLessThanOrEqual(FREE_ONBOARD_SEARCH_KEYWORDS_MAX);
  });
});

describe("free onboard schema limits", () => {
  const base = {
    submitter_name: "Pat",
    submitter_email: "pat@example.com",
    title: "Cafe",
    is_storefront: true,
    is_service_business: false,
    locations: [{ town_id: "11111111-1111-4111-8111-111111111111", address: "1 Main" }],
    website: "",
    phone: "",
    excerpt: "Short summary for the listing teaser.",
    overview: "A slightly longer overview paragraph for visitors.",
    category_id: "22222222-2222-4222-8222-222222222222",
    search_tags: ["coffee"],
    marketing_opt_in: true,
  };

  it("accepts valid payload", () => {
    const parsed = freeOnboardBodySchema.safeParse(base);
    expect(parsed.success).toBe(true);
  });

  it("accepts website without http scheme", () => {
    const parsed = freeOnboardBodySchema.safeParse({
      ...base,
      website: "amavida.com",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.website).toBe("https://amavida.com");
    }
  });

  it("does not double-prefix https when already present", () => {
    const parsed = freeOnboardBodySchema.safeParse({
      ...base,
      website: "https://amavida.com",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.website).toBe("https://amavida.com");
    }
  });

  it("rejects invalid website and phone values", () => {
    expect(
      freeOnboardBodySchema.safeParse({
        ...base,
        website: "not a url",
      }).success,
    ).toBe(false);
    expect(
      freeOnboardBodySchema.safeParse({
        ...base,
        phone: "123",
      }).success,
    ).toBe(false);
    expect(
      freeOnboardBodySchema.safeParse({
        ...base,
        phone: "(850) 555-1212",
      }).success,
    ).toBe(true);
  });

  it("rejects selecting both storefront and service", () => {
    expect(
      freeOnboardBodySchema.safeParse({
        ...base,
        is_storefront: true,
        is_service_business: true,
      }).success,
    ).toBe(false);
  });

  it("allows service-only intakes without locations when specialty is set", () => {
    const parsed = freeOnboardBodySchema.safeParse({
      ...base,
      is_storefront: false,
      is_service_business: true,
      locations: [],
      category_id: null,
      service_category_id: "33333333-3333-4333-8333-333333333333",
    });
    expect(parsed.success).toBe(true);
  });

  it("requires a service specialty for service-only intakes", () => {
    expect(
      freeOnboardBodySchema.safeParse({
        ...base,
        is_storefront: false,
        is_service_business: true,
        locations: [],
        category_id: null,
        service_category_id: null,
      }).success,
    ).toBe(false);
  });

  it("requires a storefront category or suggested category for physical locations", () => {
    expect(
      freeOnboardBodySchema.safeParse({
        ...base,
        category_id: null,
      }).success,
    ).toBe(false);
    expect(
      freeOnboardBodySchema.safeParse({
        ...base,
        category_id: null,
        suggested_category: "Kayak rentals",
      }).success,
    ).toBe(true);
  });

  it("allows service specialty suggestion without selecting an existing specialty", () => {
    expect(
      freeOnboardBodySchema.safeParse({
        ...base,
        is_storefront: false,
        is_service_business: true,
        locations: [],
        category_id: null,
        service_category_id: null,
        suggested_category: "Yacht detailing",
      }).success,
    ).toBe(true);
  });

  it("requires locations for physical storefronts", () => {
    expect(
      freeOnboardBodySchema.safeParse({
        ...base,
        is_storefront: true,
        is_service_business: false,
        locations: [],
      }).success,
    ).toBe(false);
  });

  it("rejects invalid submitter email", () => {
    expect(
      freeOnboardBodySchema.safeParse({
        ...base,
        submitter_email: "not-an-email",
      }).success,
    ).toBe(false);
  });

  it("accepts suggested tags within the shared six-tag budget", () => {
    const parsed = freeOnboardBodySchema.safeParse({
      ...base,
      search_tags: ["coffee", "wifi"],
      suggested_tags: ["marketing", "product development", "engineering", "branding"],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects when search tags plus suggested tags exceed six", () => {
    expect(
      freeOnboardBodySchema.safeParse({
        ...base,
        search_tags: ["coffee", "wifi", "pastries"],
        suggested_tags: ["marketing", "product development", "engineering", "branding"],
      }).success,
    ).toBe(false);
  });

  it("rejects more than six suggested tags alone", () => {
    expect(
      freeOnboardBodySchema.safeParse({
        ...base,
        search_tags: [],
        suggested_tags: Array.from({ length: FREE_ONBOARD_SEARCH_TAGS_MAX + 1 }, (_, i) => `tag_${i}`),
      }).success,
    ).toBe(false);
  });

  it("rejects over-limit title excerpt overview", () => {
    expect(
      freeOnboardBodySchema.safeParse({
        ...base,
        title: "t".repeat(FREE_ONBOARD_TITLE_MAX + 1),
      }).success,
    ).toBe(false);
    expect(
      freeOnboardBodySchema.safeParse({
        ...base,
        excerpt: "e".repeat(FREE_ONBOARD_EXCERPT_MAX + 1),
      }).success,
    ).toBe(false);
    expect(
      freeOnboardBodySchema.safeParse({
        ...base,
        overview: "o".repeat(FREE_ONBOARD_OVERVIEW_MAX + 1),
      }).success,
    ).toBe(false);
  });
});

describe("parseSuggestedTagsInput", () => {
  it("splits, trims, and dedupes case-insensitively", () => {
    expect(parseSuggestedTagsInput(" Marketing, product development, marketing , Engineering ")).toEqual([
      "Marketing",
      "product development",
      "Engineering",
    ]);
  });

  it("ignores empty segments", () => {
    expect(parseSuggestedTagsInput("foo,, bar,")).toEqual(["foo", "bar"]);
  });
});

describe("free onboard removal schema", () => {
  const removalBase = {
    intent: "removal" as const,
    submitter_name: "Pat",
    submitter_email: "pat@example.com",
    reason: "Business permanently closed this season.",
    target_business_slug: "amavida-seaside",
    target_business_id: "33333333-3333-4333-8333-333333333333",
  };

  it("accepts slim removal payload", () => {
    const parsed = freeOnboardRemovalBodySchema.safeParse(removalBase);
    expect(parsed.success).toBe(true);
  });

  it("requires intent removal, slug, and reason", () => {
    expect(
      freeOnboardRemovalBodySchema.safeParse({
        submitter_name: "Pat",
        submitter_email: "pat@example.com",
        reason: removalBase.reason,
        target_business_slug: "amavida-seaside",
      }).success,
    ).toBe(false);
    expect(
      freeOnboardRemovalBodySchema.safeParse({
        ...removalBase,
        target_business_slug: "",
      }).success,
    ).toBe(false);
    expect(
      freeOnboardRemovalBodySchema.safeParse({
        ...removalBase,
        reason: "too short",
      }).success,
    ).toBe(false);
  });
});
