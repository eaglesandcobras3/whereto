import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getPublicImageUrl } from "./public-image-url";

describe("getPublicImageUrl", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns absolute https URLs as-is (except legacy wrong bucket name)", () => {
    expect(
      getPublicImageUrl("https://abc.supabase.co/storage/v1/object/public/cms-media/a%20b.jpg"),
    ).toBe("https://abc.supabase.co/storage/v1/object/public/cms-media/a%20b.jpg");
  });

  it("rewrites legacy /object/public/supabase/ to whereto30a-media (Directus storage driver vs real bucket)", () => {
    expect(
      getPublicImageUrl(
        "https://bigheyxukjutfvinvdvy.supabase.co/storage/v1/object/public/supabase/05626f5c-9606-45e5-be32-05ee3475914f.webp",
      ),
    ).toBe(
      "https://bigheyxukjutfvinvdvy.supabase.co/storage/v1/object/public/whereto30a-media/05626f5c-9606-45e5-be32-05ee3475914f.webp",
    );
  });

  it("rewrites legacy /object/public/whereto-media/ to whereto30a-media", () => {
    expect(
      getPublicImageUrl(
        "https://abc.supabase.co/storage/v1/object/public/whereto-media/towns/x.webp",
      ),
    ).toBe("https://abc.supabase.co/storage/v1/object/public/whereto30a-media/towns/x.webp");
  });

  it("builds storage URL for a key under the default bucket", () => {
    expect(getPublicImageUrl("towns/grayton-hero.webp")).toBe(
      "https://abc.supabase.co/storage/v1/object/public/whereto30a-media/towns/grayton-hero.webp",
    );
  });

  it("uses first path segment as bucket for known names", () => {
    expect(getPublicImageUrl("business-images/u/1/hero.jpg")).toBe(
      "https://abc.supabase.co/storage/v1/object/public/business-images/u/1/hero.jpg",
    );
  });
});
