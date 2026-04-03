import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveTagIdsForGoogleTypes } from "./business-tags-from-google";

function mockSupabase(rows: { id: number }[]) {
  const inFn = vi.fn().mockResolvedValue({ data: rows, error: null });
  const selectFn = vi.fn().mockReturnValue({ in: inFn });
  const from = vi.fn().mockReturnValue({ select: selectFn });
  return { from, inFn, selectFn } as const;
}

describe("resolveTagIdsForGoogleTypes", () => {
  it("returns empty for missing types", async () => {
    const { from } = mockSupabase([]);
    const ids = await resolveTagIdsForGoogleTypes(
      { from } as unknown as SupabaseClient,
      undefined,
    );
    expect(ids).toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });

  it("dedupes case and queries slugs", async () => {
    const { from, inFn } = mockSupabase([{ id: 3 }, { id: 7 }]);
    const ids = await resolveTagIdsForGoogleTypes(
      { from } as unknown as SupabaseClient,
      ["Cafe", "cafe", "restaurant"],
    );
    expect(ids).toEqual([3, 7]);
    expect(inFn).toHaveBeenCalledWith("slug", ["cafe", "restaurant"]);
  });
});
