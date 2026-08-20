import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const {
  businessPhotosApiBlocked,
  requireAdminUser,
  getServiceSupabase,
  uploadPortalImage,
} = vi.hoisted(() => ({
  businessPhotosApiBlocked: vi.fn(),
  requireAdminUser: vi.fn(),
  getServiceSupabase: vi.fn(),
  uploadPortalImage: vi.fn(),
}));

vi.mock("@/lib/feature-flags", () => ({
  businessPhotosApiBlocked,
}));
vi.mock("@/lib/security/requireAdmin", () => ({
  requireAdminUser,
}));
vi.mock("@/lib/supabase/service-role", () => ({
  getServiceSupabase,
}));
vi.mock("@/lib/portal/storage-upload", () => ({
  uploadPortalImage,
}));

import { POST } from "@/app/api/admin/business-photos/route";
import { businessListingImagePatch } from "@/lib/business/listing-image-patch";

const BUSINESS_ID = "11111111-1111-1111-1111-111111111111";

describe("POST /api/admin/business-photos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    businessPhotosApiBlocked.mockResolvedValue(null);
    requireAdminUser.mockResolvedValue({ userId: "admin-1" });
    uploadPortalImage.mockResolvedValue({
      publicUrl: "https://cdn.example.com/gallery.webp",
      storagePath: "admin/businesses/x/gallery.webp",
    });
  });

  it("blocks when business_photos flag is off", async () => {
    businessPhotosApiBlocked.mockResolvedValue(
      NextResponse.json({ error: "Not found" }, { status: 404 }),
    );
    const fd = new FormData();
    fd.set("business_id", BUSINESS_ID);
    fd.set("file", new File([new Uint8Array([1])], "a.jpg", { type: "image/jpeg" }));
    const res = await POST(
      new NextRequest("http://localhost/api/admin/business-photos", {
        method: "POST",
        body: fd,
      }),
    );
    expect(res.status).toBe(404);
  });

  it("inserts approved gallery photo and can patch businesses URL columns", async () => {
    const fromCalls: string[] = [];
    const photoInsertPayloads: unknown[] = [];
    const businessUpdatePayloads: unknown[] = [];

    getServiceSupabase.mockReturnValue({
      from: vi.fn((table: string) => {
        fromCalls.push(table);
        if (table === "businesses") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: BUSINESS_ID },
                  error: null,
                }),
              }),
            }),
            update: vi.fn((patch: unknown) => {
              businessUpdatePayloads.push(patch);
              return {
                eq: vi.fn().mockResolvedValue({ error: null }),
              };
            }),
          };
        }
        if (table === "business_photos") {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
            insert: vi.fn((row: unknown) => {
              photoInsertPayloads.push(row);
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: "photo-1",
                      public_url: "https://cdn.example.com/gallery.webp",
                      is_hero: true,
                      status: "approved",
                      sort_order: null,
                      created_at: "2026-08-20T00:00:00Z",
                    },
                    error: null,
                  }),
                }),
              };
            }),
          };
        }
        return {};
      }),
    });

    const fd = new FormData();
    fd.set("business_id", BUSINESS_ID);
    fd.set("is_hero", "true");
    fd.set("file", new File([new Uint8Array([1])], "a.jpg", { type: "image/jpeg" }));

    const res = await POST(
      new NextRequest("http://localhost/api/admin/business-photos", {
        method: "POST",
        body: fd,
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.photo.status).toBe("approved");
    expect(uploadPortalImage).toHaveBeenCalled();
    expect(photoInsertPayloads[0]).toMatchObject({
      business_id: BUSINESS_ID,
      status: "approved",
      is_hero: true,
      public_url: "https://cdn.example.com/gallery.webp",
    });
    expect(businessUpdatePayloads[0]).toEqual(
      businessListingImagePatch("https://cdn.example.com/gallery.webp"),
    );
    expect(fromCalls).toContain("businesses");
    expect(fromCalls).toContain("business_photos");
    expect(fromCalls).not.toContain("businesses_view");
  });
});
