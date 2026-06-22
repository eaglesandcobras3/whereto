import { describe, it, expect } from "vitest";
import { applyGuideHeroFields } from "@/lib/rankscore/guide-image-fields";

describe("applyGuideHeroFields", () => {
  it("stores HTTP URLs in url columns only", () => {
    const payload: Record<string, unknown> = {};
    applyGuideHeroFields(
      payload,
      "https://images.pexels.com/photos/123.jpeg",
      { urlImageFields: true },
    );
    expect(payload).toEqual({
      main_image_url: "https://images.pexels.com/photos/123.jpeg",
      hero_image_url: "https://images.pexels.com/photos/123.jpeg",
    });
  });

  it("stores Directus UUIDs in image uuid columns", () => {
    const payload: Record<string, unknown> = {};
    const uuid = "11111111-1111-1111-1111-111111111111";
    applyGuideHeroFields(payload, uuid, { urlImageFields: true });
    expect(payload).toEqual({ main_image: uuid, hero_image: uuid });
  });

  it("omits HTTP URLs when url columns are unavailable", () => {
    const payload: Record<string, unknown> = {};
    applyGuideHeroFields(payload, "https://example.com/a.jpg", { urlImageFields: false });
    expect(payload).toEqual({});
  });
});
