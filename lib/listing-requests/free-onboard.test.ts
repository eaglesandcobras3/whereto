import { describe, expect, it } from "vitest";
import {
  buildFreeOnboardSeoDescription,
  buildFreeOnboardSeoTitle,
  buildFreeOnboardSlug,
} from "@/lib/listing-requests/free-onboard-derived";
import {
  FREE_ONBOARD_EXCERPT_MAX,
  FREE_ONBOARD_OVERVIEW_MAX,
  FREE_ONBOARD_TITLE_MAX,
  freeOnboardBodySchema,
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
    search_keywords: "espresso",
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
