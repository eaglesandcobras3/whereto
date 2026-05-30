import { describe, expect, it, vi, beforeEach } from "vitest";

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
    const ctx = {
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
    expect(result).toMatchObject({ resultCount: 1 });
    expect(ctx.sources).toHaveLength(1);
    expect(ctx.sources[0]?.title).toBe("Taco Shack");
    expect(ctx.artifact?.type).toBe("business_results");
    if (ctx.artifact?.type === "business_results") {
      expect(ctx.artifact.results[0]?.title).toBe("Taco Shack");
    }
  });
});
