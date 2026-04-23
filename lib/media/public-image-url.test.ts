import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getPublicImageUrl } from "./public-image-url";

describe("getPublicImageUrl", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns absolute https URLs as-is", () => {
    expect(
      getPublicImageUrl("https://abc.supabase.co/storage/v1/object/public/cms-media/a%20b.jpg"),
    ).toBe("https://abc.supabase.co/storage/v1/object/public/cms-media/a%20b.jpg");
  });

  it("builds storage URL for a key under the default bucket", () => {
    expect(getPublicImageUrl("towns/grayton-hero.webp")).toBe(
      "https://abc.supabase.co/storage/v1/object/public/whereto-media/towns/grayton-hero.webp",
    );
  });

  it("uses first path segment as bucket for known names", () => {
    expect(getPublicImageUrl("business-images/u/1/hero.jpg")).toBe(
      "https://abc.supabase.co/storage/v1/object/public/business-images/u/1/hero.jpg",
    );
  });
});
