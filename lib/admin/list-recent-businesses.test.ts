import { describe, expect, it, vi } from "vitest";
import { listRecentBusinessesForAdmin } from "@/lib/admin/list-recent-businesses";

describe("listRecentBusinessesForAdmin", () => {
  it("maps rows and detects missing photos", async () => {
    const sinceCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const gte = vi.fn().mockReturnThis();
    const order = vi.fn().mockReturnThis();
    const limit = vi.fn().mockResolvedValue({
      data: [
        {
          id: "b1",
          title: "IV Bar",
          slug: "iv-bar",
          date_created: "2026-08-20T12:00:00Z",
          main_image_url: null,
          hero_image_url: null,
          main_image: null,
          hero_image: null,
          towns: { title: "Isla Vista" },
        },
        {
          id: "b2",
          title: "Coastal Cafe",
          slug: "coastal-cafe",
          date_created: "2026-08-18T12:00:00Z",
          main_image_url: "https://cdn.example/hero.jpg",
          hero_image_url: null,
          main_image: null,
          hero_image: null,
          towns: null,
        },
      ],
      error: null,
    });

    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gte,
        order,
        limit,
      })),
    };

    const rows = await listRecentBusinessesForAdmin(supabase as never, { days: 30, limit: 10 });

    expect(gte).toHaveBeenCalledWith("date_created", expect.any(String));
    expect(new Date(gte.mock.calls[0][1] as string).getTime()).toBeLessThanOrEqual(
      new Date(sinceCutoff).getTime() + 1000,
    );
    expect(rows).toEqual([
      {
        id: "b1",
        title: "IV Bar",
        slug: "iv-bar",
        date_created: "2026-08-20T12:00:00Z",
        town_title: "Isla Vista",
        has_photo: false,
      },
      {
        id: "b2",
        title: "Coastal Cafe",
        slug: "coastal-cafe",
        date_created: "2026-08-18T12:00:00Z",
        town_title: null,
        has_photo: true,
      },
    ]);
  });
});
