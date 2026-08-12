import { describe, expect, it } from "vitest";
import { businessListingImagePatch } from "@/lib/business/listing-image-patch";
import { listingPhotoFilesFromFormData } from "@/lib/stays/listing-submission-schema";

describe("businessListingImagePatch", () => {
  it("sets main and hero URL columns and clears Directus FKs", () => {
    expect(businessListingImagePatch("https://cdn.example.com/a.webp")).toEqual({
      main_image_url: "https://cdn.example.com/a.webp",
      hero_image_url: "https://cdn.example.com/a.webp",
      main_image: null,
      hero_image: null,
    });
  });

  it("clears URLs when null", () => {
    expect(businessListingImagePatch(null)).toEqual({
      main_image_url: null,
      hero_image_url: null,
      main_image: null,
      hero_image: null,
    });
  });

  it("returns null when omitted", () => {
    expect(businessListingImagePatch(undefined)).toBeNull();
  });
});

describe("listingPhotoFilesFromFormData", () => {
  it("puts main photo first then additional", () => {
    const fd = new FormData();
    const main = new File([new Uint8Array([1])], "main.jpg", { type: "image/jpeg" });
    const extra = new File([new Uint8Array([2])], "extra.jpg", { type: "image/jpeg" });
    fd.set("photo_main", main);
    fd.append("photos", extra);
    const files = listingPhotoFilesFromFormData(fd);
    expect(files).toHaveLength(2);
    expect(files[0]?.name).toBe("main.jpg");
    expect(files[1]?.name).toBe("extra.jpg");
  });
});
