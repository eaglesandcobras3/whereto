import { describe, expect, it } from "vitest";
import {
  areaIncludedOnAreasHub,
  includedOnHubBrowse,
  townIncludedOnTownsHub,
} from "@/lib/places/hub-browse-visibility";

describe("includedOnHubBrowse", () => {
  it("shows when null, true, or undefined", () => {
    expect(includedOnHubBrowse(null)).toBe(true);
    expect(includedOnHubBrowse(true)).toBe(true);
    expect(includedOnHubBrowse(undefined)).toBe(true);
    expect(townIncludedOnTownsHub(null)).toBe(true);
    expect(areaIncludedOnAreasHub(null)).toBe(true);
  });

  it("hides only when explicitly false", () => {
    expect(includedOnHubBrowse(false)).toBe(false);
    expect(townIncludedOnTownsHub(false)).toBe(false);
    expect(areaIncludedOnAreasHub(false)).toBe(false);
  });
});
