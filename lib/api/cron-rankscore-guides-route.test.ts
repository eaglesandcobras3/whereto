import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { assertCronAuthorized, getRankScoreConfig, getServiceSupabaseOrNull, syncRankScoreGuides } =
  vi.hoisted(() => ({
    assertCronAuthorized: vi.fn(),
    getRankScoreConfig: vi.fn(),
    getServiceSupabaseOrNull: vi.fn(),
    syncRankScoreGuides: vi.fn(),
  }));

vi.mock("@/lib/cron-auth", () => ({ assertCronAuthorized }));
vi.mock("@/lib/rankscore/config", () => ({ getRankScoreConfig }));
vi.mock("@/lib/supabase/service-role", () => ({ getServiceSupabaseOrNull }));
vi.mock("@/lib/rankscore/sync-guides", () => ({ syncRankScoreGuides }));

import { GET } from "@/app/api/cron/rankscore-guides/route";

describe("GET /api/cron/rankscore-guides", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertCronAuthorized.mockImplementation(() => {});
    getRankScoreConfig.mockReturnValue({ apiBase: "https://example.com", apiKey: "key" });
    getServiceSupabaseOrNull.mockReturnValue({});
  });

  it("returns sync summary when configured", async () => {
    syncRankScoreGuides.mockResolvedValue({
      scanned: 3,
      fetched: 2,
      created: 1,
      updated: 1,
      skipped: 0,
      errors: [],
    });

    const res = await GET(new NextRequest("http://localhost/api/cron/rankscore-guides"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      scanned: 3,
      fetched: 2,
      created: 1,
      updated: 1,
      skipped: 0,
      errors: [],
    });
  });

  it("returns 401 when cron auth fails", async () => {
    assertCronAuthorized.mockImplementation(() => {
      throw new Error("no");
    });
    const res = await GET(new NextRequest("http://localhost/api/cron/rankscore-guides"));
    expect(res.status).toBe(401);
  });

  it("skips when RankScore env is missing", async () => {
    getRankScoreConfig.mockReturnValue(null);
    const res = await GET(new NextRequest("http://localhost/api/cron/rankscore-guides"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: false, skipped: true });
  });
});
