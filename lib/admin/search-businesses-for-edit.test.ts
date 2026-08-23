import { describe, expect, it, vi } from "vitest";
import {
  resolveBusinessIdForAdminEdit,
  searchBusinessesForAdminEdit,
} from "@/lib/admin/search-businesses-for-edit";

describe("searchBusinessesForAdminEdit", () => {
  it("searches title or slug on businesses table", async () => {
    const or = vi.fn().mockReturnThis();
    const limit = vi.fn().mockResolvedValue({
      data: [
        {
          id: "b1",
          title: "IV Bar",
          slug: "iv-bar",
          status: "draft",
          towns: { title: "Isla Vista" },
        },
      ],
      error: null,
    });

    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        or,
        order: vi.fn().mockReturnThis(),
        limit,
      })),
    };

    const rows = await searchBusinessesForAdminEdit(supabase as never, "iv", 10);
    expect(or).toHaveBeenCalledWith("title.ilike.%iv%,slug.ilike.%iv%");
    expect(rows[0]).toMatchObject({
      id: "b1",
      title: "IV Bar",
      slug: "iv-bar",
      status: "draft",
      town_title: "Isla Vista",
    });
  });
});

describe("resolveBusinessIdForAdminEdit", () => {
  it("resolves slug to id", async () => {
    const eq = vi.fn().mockReturnThis();
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: "uuid-1" }, error: null });
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq,
        is: vi.fn().mockReturnThis(),
        maybeSingle,
      })),
    };

    const id = await resolveBusinessIdForAdminEdit(supabase as never, "iv-bar");
    expect(eq).toHaveBeenCalledWith("slug", "iv-bar");
    expect(id).toBe("uuid-1");
  });
});
