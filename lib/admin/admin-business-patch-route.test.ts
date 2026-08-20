import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const {
  adminBusinessDirectEditApiBlocked,
  requireAdminUser,
  getServiceSupabase,
} = vi.hoisted(() => ({
  adminBusinessDirectEditApiBlocked: vi.fn(),
  requireAdminUser: vi.fn(),
  getServiceSupabase: vi.fn(),
}));

vi.mock("@/lib/feature-flags", () => ({
  adminBusinessDirectEditApiBlocked,
}));
vi.mock("@/lib/security/requireAdmin", () => ({
  requireAdminUser,
}));
vi.mock("@/lib/supabase/service-role", () => ({
  getServiceSupabase,
}));

import { PATCH } from "@/app/api/admin/businesses/[businessId]/route";

const BUSINESS_ID = "11111111-1111-1111-1111-111111111111";

function existingRow() {
  return {
    id: BUSINESS_ID,
    title: "Cafe",
    slug: "cafe",
    phone: null,
    email: null,
    website: null,
    address: null,
    excerpt: "Nice spot",
    overview: null,
    content: null,
    seo_title: null,
    seo_description: null,
    search_keywords: null,
    search_terms: "cafe nice spot",
    embedding_summary: "Cafe. Nice spot",
    service_area: null,
    town_id: null,
    area_id: null,
    primary_category_id: null,
    is_storefront: true,
    is_service_business: false,
    is_verified: false,
    is_explorable: false,
    map_lat: null,
    map_lng: null,
    search_tags: [],
    main_image_url: null,
    hero_image_url: null,
    status: "published",
  };
}

describe("PATCH /api/admin/businesses/[businessId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminBusinessDirectEditApiBlocked.mockResolvedValue(null);
    requireAdminUser.mockResolvedValue({ userId: "admin-1" });
  });

  it("returns 404 when the feature flag blocks the route", async () => {
    adminBusinessDirectEditApiBlocked.mockResolvedValue(
      NextResponse.json({ error: "Not found" }, { status: 404 }),
    );
    const res = await PATCH(
      new NextRequest(`http://localhost/api/admin/businesses/${BUSINESS_ID}`, {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated" }),
      }),
      { params: Promise.resolve({ businessId: BUSINESS_ID }) },
    );
    expect(res.status).toBe(404);
    expect(getServiceSupabase).not.toHaveBeenCalled();
  });

  it("rejects non-admins", async () => {
    requireAdminUser.mockResolvedValue(null);
    const res = await PATCH(
      new NextRequest(`http://localhost/api/admin/businesses/${BUSINESS_ID}`, {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated" }),
      }),
      { params: Promise.resolve({ businessId: BUSINESS_ID }) },
    );
    expect(res.status).toBe(403);
  });

  it("updates public.businesses (never businesses_view)", async () => {
    const fromCalls: string[] = [];
    const updated = { ...existingRow(), title: "Updated Cafe" };
    const updateEq = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: updated, error: null }),
      }),
    });
    const update = vi.fn().mockReturnValue({ eq: updateEq });
    const selectMaybe = vi.fn().mockResolvedValue({ data: existingRow(), error: null });
    const selectEq = vi.fn().mockReturnValue({ maybeSingle: selectMaybe });
    const select = vi.fn().mockReturnValue({ eq: selectEq });

    getServiceSupabase.mockReturnValue({
      from: vi.fn((table: string) => {
        fromCalls.push(table);
        return { select, update };
      }),
    });

    const res = await PATCH(
      new NextRequest(`http://localhost/api/admin/businesses/${BUSINESS_ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated Cafe" }),
      }),
      { params: Promise.resolve({ businessId: BUSINESS_ID }) },
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.business.title).toBe("Updated Cafe");
    expect(fromCalls.every((t) => t === "businesses")).toBe(true);
    expect(fromCalls).not.toContain("businesses_view");
    expect(update).toHaveBeenCalled();
    expect(update.mock.calls[0][0]).toMatchObject({ title: "Updated Cafe" });
  });
});
