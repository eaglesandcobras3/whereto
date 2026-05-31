import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AskToolContext } from "@/lib/ask/tools";

vi.mock("server-only", () => ({}));

const runSearchMock = vi.fn();

vi.mock("@/lib/search/run-search", () => ({
  runSearch: (...args: unknown[]) => runSearchMock(...args),
}));

vi.mock("@/lib/ask/search-guides", () => ({
  searchGuidesInDb: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/supabase/service-role", () => ({
  getServiceSupabase: () => ({
    from: () => ({
      select: () => ({
        or: () => ({
          maybeSingle: () => Promise.resolve({ data: null }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/ask/ambient-context", () => ({
  getAmbientContext: vi.fn().mockResolvedValue({
    weather: { condition: "clear", temperatureF: 75, isHot: false, isVeryHot: false, isRainy: false, isStormy: false, isCool: false },
    timeOfDay: "midday",
    hourLocal: 12,
    season: "shoulder_quiet",
    crowdLevel: "quiet",
    isPeakWeekend: false,
    dayOfWeek: 3,
    todayEvents: [],
    contextHints: [],
    searchSignals: {
      preferIndoor: false,
      preferCold: false,
      preferShaded: false,
      avoidCrowded: false,
      seasonClosed: false,
      impliedMealPeriod: "lunch",
      stormWindow: false,
      happyHour: false,
      preferCoffeePeak: false,
      preferNightlife: false,
      suggestLightBite: false,
    },
    fetchedAt: Date.now(),
  }),
  formatAmbientContextForPrompt: () => "",
}));

describe("searchBusinesses tool", () => {
  beforeEach(() => {
    runSearchMock.mockReset();
    runSearchMock.mockResolvedValue({
      query: "tacos",
      normalized_query: "tacos",
      summary: "Taco spots",
      recommendations: [
        {
          business_id: "biz-1",
          headline: "Great tacos",
          explanation: "Verified listing",
          business: { name: "Taco Shack", slug: "taco-shack" },
        },
      ],
      suggestions: [],
    });
  });

  it("returns only businesses from runSearch payload", async () => {
    const { createAskTools } = await import("@/lib/ask/tools");
    const ctx: AskToolContext = {
      conversationId: "conv-1",
      activeFilters: {},
      sources: [],
      confidenceScore: 0.5,
      handoffRequired: false,
      followUps: [],
    };
    const tools = createAskTools(ctx);
    const result = await tools.searchBusinesses.execute!(
      { query: "tacos near Seaside" },
      { toolCallId: "1", messages: [] },
    );

    expect(runSearchMock).toHaveBeenCalled();
    expect(runSearchMock.mock.calls[0]?.[0]).toMatchObject({
      constrainCategorySlug: null,
    });
    expect(result).toMatchObject({ resultCount: 1 });
    expect(ctx.sources).toHaveLength(1);
    expect(ctx.sources[0]?.title).toBe("Taco Shack");
    expect(ctx.artifact?.type).toBe("business_results");
    if (ctx.artifact?.type === "business_results") {
      expect(ctx.artifact.results[0]?.title).toBe("Taco Shack");
    }
  });

  it("normalizes category coffee to coffee_shops for runSearch", async () => {
    runSearchMock.mockResolvedValue({
      query: "coffee",
      normalized_query: "coffee",
      summary: "Coffee",
      recommendations: [
        {
          business_id: "biz-2",
          headline: "Test Cafe",
          explanation: "Verified",
          business: { name: "Test Cafe", slug: "test-cafe" },
        },
      ],
      suggestions: [],
    });
    const { createAskTools } = await import("@/lib/ask/tools");
    const ctx: AskToolContext = {
      conversationId: "conv-1",
      activeFilters: {},
      sources: [],
      confidenceScore: 0.5,
      handoffRequired: false,
      followUps: [],
    };
    const tools = createAskTools(ctx);
    await tools.searchBusinesses.execute!(
      { query: "coffee near seaside", category: "coffee" },
      { toolCallId: "2", messages: [] },
    );

    expect(
      runSearchMock.mock.calls.some(
        (call) => call[0]?.constrainCategorySlug === "coffee_shops",
      ),
    ).toBe(true);
    expect(ctx.activeFilters.category).toBe("coffee_shops");
  });
});
