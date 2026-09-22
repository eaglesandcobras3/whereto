import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const { communityTipsApiBlocked, requireAdminUser, getServiceSupabase, entityExists } = vi.hoisted(
  () => ({
    communityTipsApiBlocked: vi.fn(),
    requireAdminUser: vi.fn(),
    getServiceSupabase: vi.fn(),
    entityExists: vi.fn(),
  }),
);

vi.mock("@/lib/feature-flags", () => ({
  communityTipsApiBlocked,
}));
vi.mock("@/lib/security/requireAdmin", () => ({
  requireAdminUser,
}));
vi.mock("@/lib/supabase/service-role", () => ({
  getServiceSupabase,
}));
vi.mock("@/lib/community-tips/queries", () => ({
  entityExists,
}));

import { POST } from "@/app/api/admin/community-tips/route";

const ENTITY_ID = "a1b2c3d4-e5f6-4789-a012-3456789abcde";
const TIP_ID = "11111111-1111-4111-8111-111111111111";

function post(body: unknown) {
  return POST(
    new NextRequest("http://localhost/api/admin/community-tips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/admin/community-tips", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    communityTipsApiBlocked.mockResolvedValue(null);
    requireAdminUser.mockResolvedValue({ userId: "admin-1" });
    entityExists.mockResolvedValue(true);
  });

  it("returns 404 when the feature flag blocks the route", async () => {
    communityTipsApiBlocked.mockResolvedValue(
      NextResponse.json({ error: "Not found" }, { status: 404 }),
    );
    const res = await post({ action: "plant" });
    expect(res.status).toBe(404);
    expect(getServiceSupabase).not.toHaveBeenCalled();
  });

  it("rejects non-admins", async () => {
    requireAdminUser.mockResolvedValue(null);
    const res = await post({
      action: "plant",
      entity_type: "business",
      entity_id: ENTITY_ID,
      body: "Great patio for sunset drinks.",
      attribution_city: "Atlanta",
    });
    expect(res.status).toBe(403);
  });

  it("plants a published tip with a future created_at", async () => {
    const insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: TIP_ID,
            status: "published",
            is_planted: true,
            created_at: "2026-09-25T12:00:00.000Z",
          },
          error: null,
        }),
      }),
    });
    getServiceSupabase.mockReturnValue({ from: vi.fn(() => ({ insert })) });

    const res = await post({
      action: "plant",
      entity_type: "business",
      entity_id: ENTITY_ID,
      body: "Great patio for sunset drinks.",
      attribution_city: "Atlanta",
      schedule: "random_future",
      window_days: 7,
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(insert).toHaveBeenCalled();
    const row = insert.mock.calls[0][0] as {
      is_planted: boolean;
      status: string;
      created_at: string;
      user_id: string;
    };
    expect(row.is_planted).toBe(true);
    expect(row.status).toBe("published");
    expect(row.user_id).toBe("admin-1");
    expect(Date.parse(row.created_at)).toBeGreaterThan(Date.now());
  });

  it("stamps publish-later onto a pending tip", async () => {
    const updateEq = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: TIP_ID, status: "published", created_at: "2026-09-26T08:00:00.000Z" },
          error: null,
        }),
      }),
    });
    const update = vi.fn().mockReturnValue({ eq: updateEq });
    getServiceSupabase.mockReturnValue({ from: vi.fn(() => ({ update })) });

    const res = await post({
      id: TIP_ID,
      action: "publish",
      schedule: "random_future",
      window_days: 14,
    });

    expect(res.status).toBe(200);
    const patch = update.mock.calls[0][0] as { status: string; created_at: string };
    expect(patch.status).toBe("published");
    expect(Date.parse(patch.created_at)).toBeGreaterThan(Date.now());
  });

  it("does not rewrite created_at when publishing now", async () => {
    const updateEq = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: TIP_ID, status: "published" },
          error: null,
        }),
      }),
    });
    const update = vi.fn().mockReturnValue({ eq: updateEq });
    getServiceSupabase.mockReturnValue({ from: vi.fn(() => ({ update })) });

    const res = await post({ id: TIP_ID, action: "publish" });
    expect(res.status).toBe(200);
    expect(update.mock.calls[0][0]).not.toHaveProperty("created_at");
  });
});
