import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { assertCronAuthorized, runDiscoveryBatch } = vi.hoisted(() => ({
  assertCronAuthorized: vi.fn(),
  runDiscoveryBatch: vi.fn(),
}));

vi.mock("@/lib/cron-auth", () => ({
  assertCronAuthorized,
}));

vi.mock("@/lib/ingestion/discovery-runner", () => ({
  runDiscoveryBatch,
}));

import { GET } from "@/app/api/cron/discovery/route";

describe("GET /api/cron/discovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertCronAuthorized.mockImplementation(() => {});
  });

  it("returns JSON from runDiscoveryBatch when authorized", async () => {
    runDiscoveryBatch.mockResolvedValue({
      processed: 2,
      newBusinesses: 1,
    });
    const res = await GET(
      new NextRequest("http://localhost/api/cron/discovery"),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      processed: 2,
      newBusinesses: 1,
    });
  });

  it("returns 401 when cron auth fails", async () => {
    assertCronAuthorized.mockImplementation(() => {
      throw new Error("no");
    });
    const res = await GET(
      new NextRequest("http://localhost/api/cron/discovery"),
    );
    expect(res.status).toBe(401);
  });
});
