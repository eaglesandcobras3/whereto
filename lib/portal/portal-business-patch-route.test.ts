import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  onboardApiBlocked,
  requireBusinessMember,
  getServiceSupabase,
  getBusinessPlan,
  sendPortalOwnerEmail,
} = vi.hoisted(() => ({
  onboardApiBlocked: vi.fn(),
  requireBusinessMember: vi.fn(),
  getServiceSupabase: vi.fn(),
  getBusinessPlan: vi.fn(),
  sendPortalOwnerEmail: vi.fn(),
}));

vi.mock("@/lib/feature-flags", () => ({
  onboardApiBlocked,
}));
vi.mock("@/lib/portal/require-business-member", () => ({
  requireBusinessMember,
}));
vi.mock("@/lib/supabase/service-role", () => ({
  getServiceSupabase,
}));
vi.mock("@/lib/portal/entitlements", async () => {
  const actual = await vi.importActual<typeof import("@/lib/portal/entitlements")>(
    "@/lib/portal/entitlements",
  );
  return {
    ...actual,
    getBusinessPlan,
  };
});
vi.mock("@/lib/portal/notifications", () => ({
  sendPortalOwnerEmail,
}));

import { PATCH } from "@/app/api/portal/businesses/[businessId]/route";

const BUSINESS_ID = "11111111-1111-1111-1111-111111111111";

describe("PATCH /api/portal/businesses/[businessId] (proposal regression)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onboardApiBlocked.mockResolvedValue(null);
    requireBusinessMember.mockResolvedValue({ userId: "owner-1" });
    getBusinessPlan.mockResolvedValue({
      planSlug: "claimed_listing",
      entitlements: {
        max_photos: 2,
        hours: false,
        social_links: false,
        long_description: false,
      },
    });
    sendPortalOwnerEmail.mockResolvedValue(undefined);
  });

  it("creates a business_edit_proposals row instead of updating businesses", async () => {
    const insertTables: string[] = [];
    const updateTables: string[] = [];

    const proposalInsert = {
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "proposal-1" },
          error: null,
        }),
      }),
    };
    const reviewInsert = {
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "review-1" },
          error: null,
        }),
      }),
    };

    getServiceSupabase.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "business_edit_proposals") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              }),
            }),
            insert: vi.fn((row: unknown) => {
              insertTables.push(table);
              expect(row).toMatchObject({
                business_id: BUSINESS_ID,
                status: "pending",
                changes: { phone: "850-555-0100" },
              });
              return proposalInsert;
            }),
            update: vi.fn(() => {
              updateTables.push(table);
              return {
                eq: vi.fn().mockResolvedValue({ error: null }),
              };
            }),
          };
        }
        if (table === "portal_review_items") {
          return {
            insert: vi.fn(() => {
              insertTables.push(table);
              return reviewInsert;
            }),
          };
        }
        if (table === "businesses") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: BUSINESS_ID,
                    title: "Cafe",
                    slug: "cafe",
                    phone: null,
                    email: null,
                    website: null,
                    address: null,
                    excerpt: null,
                    content: null,
                    hours: null,
                    social_links: null,
                    service_area: null,
                  },
                  error: null,
                }),
              }),
            }),
            update: vi.fn(() => {
              updateTables.push(table);
              throw new Error("Portal PATCH must not update businesses directly");
            }),
          };
        }
        return {};
      }),
      auth: {
        admin: {
          getUserById: vi.fn().mockResolvedValue({ data: { user: { email: null } } }),
        },
      },
    });

    const res = await PATCH(
      new NextRequest(`http://localhost/api/portal/businesses/${BUSINESS_ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "850-555-0100" }),
      }),
      { params: Promise.resolve({ businessId: BUSINESS_ID }) },
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.review_item_id).toBe("review-1");
    expect(insertTables).toContain("business_edit_proposals");
    expect(insertTables).toContain("portal_review_items");
    expect(updateTables).not.toContain("businesses");
  });
});
