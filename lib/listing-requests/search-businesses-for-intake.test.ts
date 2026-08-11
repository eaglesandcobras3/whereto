import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { searchBusinessesForIntake } from "@/lib/listing-requests/search-businesses-for-intake";

function mockQuery(rows: unknown[]) {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  for (const method of [
    "select",
    "is",
    "eq",
    "or",
    "ilike",
    "order",
    "limit",
  ]) {
    builder[method] = vi.fn(chain);
  }
  builder.then = undefined;
  // Terminal: awaiting the builder resolves via thenable simulation —
  // supabase client returns a promise-like from the last call.
  (builder.limit as ReturnType<typeof vi.fn>).mockResolvedValue({
    data: rows,
    error: null,
  });
  return builder;
}

describe("searchBusinessesForIntake", () => {
  it("returns [] for short queries", async () => {
    const supabase = { from: vi.fn() } as unknown as SupabaseClient;
    await expect(searchBusinessesForIntake(supabase, "a")).resolves.toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("maps town title from relation", async () => {
    const builder = mockQuery([
      {
        id: "abc",
        title: "Amavida",
        slug: "amavida-coffee",
        towns: { title: "Rosemary Beach" },
      },
    ]);
    const supabase = {
      from: vi.fn(() => builder),
    } as unknown as SupabaseClient;

    await expect(searchBusinessesForIntake(supabase, "ama")).resolves.toEqual([
      {
        id: "abc",
        title: "Amavida",
        slug: "amavida-coffee",
        town_title: "Rosemary Beach",
      },
    ]);
    expect(supabase.from).toHaveBeenCalledWith("businesses_view");
    expect(builder.ilike).toHaveBeenCalledWith("title", "%ama%");
  });
});
