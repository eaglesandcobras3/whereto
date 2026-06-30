import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/cron-auth", () => ({
  assertCronAuthorized: vi.fn(),
}));

vi.mock("@/lib/site-url", () => ({
  getSiteUrl: () => "https://whereto30a.com",
}));

vi.mock("@/lib/supabase/service-role", () => ({
  getServiceSupabaseOrNull: () => null,
}));

vi.mock("@/lib/seo/site-audit/run-audit", () => ({
  runSiteAuditWithMarkdown: vi.fn(async () => ({
    report: {
      baseUrl: "https://whereto30a.com",
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      summary: {
        urlsDiscovered: 10,
        urlsCrawled: 10,
        urlsFailed: 0,
        issueCounts: { error: 0, warning: 1, notice: 2 },
        categoryCounts: { content: 1, technical: 2 },
        topRules: [],
        durationMs: 1000,
      },
      issues: [],
      crawledUrls: [],
      sitemapUrls: [],
      seedUrls: [],
    },
    markdown: "# report",
  })),
}));

import { assertCronAuthorized } from "@/lib/cron-auth";
import { GET } from "@/app/api/cron/seo-audit/route";

describe("GET /api/cron/seo-audit", () => {
  beforeEach(() => {
    vi.mocked(assertCronAuthorized).mockReset();
  });

  it("returns audit summary when authorized", async () => {
    vi.mocked(assertCronAuthorized).mockImplementation(() => undefined);
    const res = await GET(new NextRequest("http://localhost/api/cron/seo-audit"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.summary.urlsCrawled).toBe(10);
  });

  it("returns 401 when unauthorized", async () => {
    vi.mocked(assertCronAuthorized).mockImplementation(() => {
      throw new Error("Unauthorized cron");
    });
    const res = await GET(new NextRequest("http://localhost/api/cron/seo-audit"));
    expect(res.status).toBe(401);
  });
});
