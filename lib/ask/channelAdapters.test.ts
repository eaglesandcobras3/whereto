import { describe, expect, it } from "vitest";
import { compressArtifactForChannel, formatForSms } from "@/lib/ask/channelAdapters";
import type { AskEngineResult } from "@/lib/ask/types";

const businessArtifact = {
  type: "business_results" as const,
  title: "Dinner",
  activeFilters: {},
  results: [
    {
      id: "1",
      title: "A",
      slug: "a",
      town_or_area: null,
      category: null,
      excerpt: null,
      price_level: null,
      tags: [],
      why_this_matched: "match",
      confidence_score: 0.9,
      source_status: "verified" as const,
    },
    {
      id: "2",
      title: "B",
      slug: "b",
      town_or_area: null,
      category: null,
      excerpt: null,
      price_level: null,
      tags: [],
      why_this_matched: "match",
      confidence_score: 0.8,
      source_status: "verified" as const,
    },
    {
      id: "3",
      title: "C",
      slug: "c",
      town_or_area: null,
      category: null,
      excerpt: null,
      price_level: null,
      tags: [],
      why_this_matched: "match",
      confidence_score: 0.7,
      source_status: "verified" as const,
    },
    {
      id: "4",
      title: "D",
      slug: "d",
      town_or_area: null,
      category: null,
      excerpt: null,
      price_level: null,
      tags: [],
      why_this_matched: "match",
      confidence_score: 0.6,
      source_status: "verified" as const,
    },
  ],
};

describe("formatForSms", () => {
  it("limits business lines for SMS", () => {
    const result: AskEngineResult = {
      conversationId: "c",
      message: "Here are picks",
      artifact: businessArtifact,
      confidenceScore: 0.8,
      handoffRequired: false,
      sources: [],
    };
    const { text } = formatForSms(result);
    expect(text).toContain("1. A");
    expect(text).not.toContain("4. D");
  });
});

describe("compressArtifactForChannel", () => {
  it("slices business results on sms channel", () => {
    const compressed = compressArtifactForChannel(businessArtifact, "sms");
    expect(compressed?.type).toBe("business_results");
    if (compressed?.type === "business_results") {
      expect(compressed.results).toHaveLength(3);
    }
  });
});
