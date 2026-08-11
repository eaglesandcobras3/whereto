import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { getAllFeatureFlags, getServiceSupabaseOrNull, searchBusinessesForIntake } = vi.hoisted(
  () => ({
    getAllFeatureFlags: vi.fn(),
    getServiceSupabaseOrNull: vi.fn(),
    searchBusinessesForIntake: vi.fn(),
  }),
);

vi.mock("@/lib/feature-flags", () => ({
  getAllFeatureFlags,
  isFreeOnboardEnabled: (flags: { free_onboard?: boolean }) => Boolean(flags.free_onboard),
}));
vi.mock("@/lib/supabase/service-role", () => ({ getServiceSupabaseOrNull }));
vi.mock("@/lib/listing-requests/search-businesses-for-intake", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/listing-requests/search-businesses-for-intake")
  >("@/lib/listing-requests/search-businesses-for-intake");
  return {
    ...actual,
    searchBusinessesForIntake,
  };
});

import { GET } from "@/app/api/listing-requests/business-search/route";

describe("GET /api/listing-requests/business-search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAllFeatureFlags.mockResolvedValue({ free_onboard: true });
    getServiceSupabaseOrNull.mockReturnValue({});
  });

  it("returns 404 when free onboard is off", async () => {
    getAllFeatureFlags.mockResolvedValue({ free_onboard: false });
    const res = await GET(
      new NextRequest("http://localhost/api/listing-requests/business-search?q=bud"),
    );
    expect(res.status).toBe(404);
  });

  it("returns empty list for short queries without searching", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/listing-requests/business-search?q=a"),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ businesses: [] });
    expect(searchBusinessesForIntake).not.toHaveBeenCalled();
  });

  it("returns search hits", async () => {
    searchBusinessesForIntake.mockResolvedValue([
      {
        id: "1",
        title: "Bud & Alley's",
        slug: "bud-alleys",
        town_title: "Seaside",
      },
    ]);
    const res = await GET(
      new NextRequest("http://localhost/api/listing-requests/business-search?q=bud"),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      businesses: [
        {
          id: "1",
          title: "Bud & Alley's",
          slug: "bud-alleys",
          town_title: "Seaside",
        },
      ],
    });
    expect(searchBusinessesForIntake).toHaveBeenCalled();
  });

  it("returns 503 when supabase is unavailable", async () => {
    getServiceSupabaseOrNull.mockReturnValue(null);
    const res = await GET(
      new NextRequest("http://localhost/api/listing-requests/business-search?q=bud"),
    );
    expect(res.status).toBe(503);
  });
});
