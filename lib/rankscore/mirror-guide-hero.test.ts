import { describe, it, expect } from "vitest";
import { mirrorGuideHeroToStorage } from "@/lib/rankscore/mirror-guide-hero";

describe("mirrorGuideHeroToStorage", () => {
  it("returns null for non-http sources", async () => {
    const supabase = {} as Parameters<typeof mirrorGuideHeroToStorage>[0];
    await expect(
      mirrorGuideHeroToStorage(supabase, { sourceUrl: "not-a-url", slug: "test" }),
    ).resolves.toBeNull();
  });
});
