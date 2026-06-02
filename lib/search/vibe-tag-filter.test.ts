import { describe, expect, it } from "vitest";
import { rowMatchesVibeTags } from "@/lib/search/vibe-tag-filter";

describe("rowMatchesVibeTags", () => {
  it("allows untagged listings for soft kid_friendly preference", () => {
    expect(rowMatchesVibeTags(null, ["kid_friendly"])).toBe(true);
    expect(rowMatchesVibeTags([], ["kid_friendly"])).toBe(true);
  });

  it("excludes listings tagged without kid_friendly when they have other tags", () => {
    expect(rowMatchesVibeTags(["upscale", "date_night"], ["kid_friendly"])).toBe(false);
  });

  it("keeps hard tags strict", () => {
    expect(rowMatchesVibeTags(["casual"], ["upscale"])).toBe(false);
    expect(rowMatchesVibeTags(["upscale"], ["upscale"])).toBe(true);
  });
});
