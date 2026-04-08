import { describe, expect, it } from "vitest";
import { businessListingImageUrl } from "./place-photo";

describe("place-photo", () => {
  it("businessListingImageUrl accepts https URLs only", () => {
    expect(
      businessListingImageUrl(
        "https://x.supabase.co/storage/v1/object/public/business-images/u/hero.jpg",
      ),
    ).toBe(
      "https://x.supabase.co/storage/v1/object/public/business-images/u/hero.jpg",
    );
    expect(businessListingImageUrl("/api/place-photo?name=foo")).toBe(null);
    expect(businessListingImageUrl(null)).toBe(null);
  });
});
