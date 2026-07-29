import { describe, expect, it, beforeEach } from "vitest";
import {
  formatTipAttribution,
  tipAttributionSaid,
  entityPublicPath,
} from "@/lib/community-tips/attribution";
import {
  isCommunityTipsUserRateLimited,
  resetCommunityTipsRateLimitForTests,
} from "@/lib/community-tips/rate-limit";
import {
  communityTipUpsertSchema,
  COMMUNITY_TIP_BODY_MIN,
} from "@/lib/community-tips/schema";
import {
  isCommunityTipsEnabled,
  resolveFeatureFlags,
} from "@/lib/feature-flags-core";

describe("community_tips flag", () => {
  it("defaults off", () => {
    expect(isCommunityTipsEnabled(resolveFeatureFlags({}))).toBe(false);
  });

  it("enables when PostHog flag is true", () => {
    expect(isCommunityTipsEnabled(resolveFeatureFlags({ community_tips: true }))).toBe(true);
  });
});

describe("tip attribution", () => {
  it("formats city-based semi-anonymous lines", () => {
    expect(formatTipAttribution("Birmingham")).toBe("Someone from Birmingham");
    expect(tipAttributionSaid("Birmingham")).toBe("Someone from Birmingham said");
  });

  it("falls back without city", () => {
    expect(formatTipAttribution(null)).toBe("A visitor");
    expect(formatTipAttribution("  ")).toBe("A visitor");
  });

  it("builds entity paths", () => {
    expect(entityPublicPath("business", "foo")).toBe("/business/foo");
    expect(entityPublicPath("town", "seaside")).toBe("/town/seaside");
    expect(entityPublicPath("area", "a")).toBe("/area/a");
    expect(entityPublicPath("guide", "g")).toBe("/guide/g");
  });
});

describe("community tip schema", () => {
  const entityId = "a1b2c3d4-e5f6-4789-a012-3456789abcde";

  it("accepts a text tip without rating", () => {
    const parsed = communityTipUpsertSchema.safeParse({
      entity_type: "business",
      entity_id: entityId,
      body: "x".repeat(COMMUNITY_TIP_BODY_MIN),
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.rating).toBeUndefined();
  });

  it("accepts optional stars on a tip", () => {
    const parsed = communityTipUpsertSchema.safeParse({
      entity_type: "town",
      entity_id: entityId,
      body: "x".repeat(COMMUNITY_TIP_BODY_MIN),
      rating: 4,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.rating).toBe(4);
  });

  it("rejects invalid ratings", () => {
    const parsed = communityTipUpsertSchema.safeParse({
      entity_type: "town",
      entity_id: entityId,
      body: "x".repeat(COMMUNITY_TIP_BODY_MIN),
      rating: 6,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("community tips rate limit", () => {
  beforeEach(() => {
    resetCommunityTipsRateLimitForTests();
    process.env.COMMUNITY_TIPS_RATE_LIMIT_MAX = "2";
    process.env.COMMUNITY_TIPS_RATE_LIMIT_WINDOW_SEC = "3600";
    delete process.env.DISABLE_COMMUNITY_TIPS_RATE_LIMIT;
  });

  it("allows up to max then blocks", () => {
    expect(isCommunityTipsUserRateLimited("u1")).toBe(false);
    expect(isCommunityTipsUserRateLimited("u1")).toBe(false);
    expect(isCommunityTipsUserRateLimited("u1")).toBe(true);
  });
});
