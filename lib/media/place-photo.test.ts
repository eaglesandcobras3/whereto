import { describe, expect, it } from "vitest";
import {
  firstPlacePhotoProxyUrl,
  isValidPlacePhotoName,
  placePhotoProxyUrl,
} from "./place-photo";

describe("place-photo", () => {
  it("accepts valid Places photo resource names", () => {
    expect(
      isValidPlacePhotoName("places/ChIJx/photos/AWn5SU4"),
    ).toBe(true);
  });

  it("rejects traversal and junk", () => {
    expect(isValidPlacePhotoName("places/../evil")).toBe(false);
    expect(isValidPlacePhotoName("http://evil.com")).toBe(false);
    expect(isValidPlacePhotoName("")).toBe(false);
  });

  it("builds proxy URL for first valid photo", () => {
    expect(
      firstPlacePhotoProxyUrl([
        "bad",
        "places/X/photos/Y",
      ]),
    ).toBe("/api/place-photo?name=places%2FX%2Fphotos%2FY");
  });

  it("placePhotoProxyUrl encodes name", () => {
    expect(placePhotoProxyUrl("places/A/photos/B")).toBe(
      "/api/place-photo?name=places%2FA%2Fphotos%2FB",
    );
  });
});
