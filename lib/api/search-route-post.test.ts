import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { isSearchRateLimited, runSearch, createSupabaseServerClient } =
  vi.hoisted(() => ({
    isSearchRateLimited: vi.fn(),
    runSearch: vi.fn(),
    createSupabaseServerClient: vi.fn(),
  }));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitKeyFromRequest: () => "test-ip",
  isSearchRateLimited,
}));

vi.mock("@/lib/search/run-search", () => ({
  runSearch,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient,
}));

import { POST } from "@/app/api/search/route";

describe("POST /api/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isSearchRateLimited.mockReturnValue(false);
    createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    });
    runSearch.mockResolvedValue({
      query: "coffee",
      query_hash: "h",
      normalized_query: "coffee",
      summary: "ok",
      recommendations: [],
      cached: false,
    });
  });

  it("returns 429 when rate limited", async () => {
    isSearchRateLimited.mockReturnValue(true);
    const res = await POST(
      new NextRequest("http://localhost/api/search", {
        method: "POST",
        body: JSON.stringify({ query: "x" }),
      }),
    );
    expect(res.status).toBe(429);
    expect(runSearch).not.toHaveBeenCalled();
  });

  it("returns 400 for empty query", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/search", {
        method: "POST",
        body: JSON.stringify({ query: "  " }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns search payload on success", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/search", {
        method: "POST",
        body: JSON.stringify({ query: "coffee" }),
      }),
    );
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.summary).toBe("ok");
    expect(runSearch).toHaveBeenCalledWith(
      expect.objectContaining({ rawQuery: "coffee", userId: null }),
    );
  });
});
