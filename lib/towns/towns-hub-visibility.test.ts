import { describe, expect, it } from "vitest";
import { townIncludedOnTownsHub } from "@/lib/towns/towns-hub-visibility";

describe("townIncludedOnTownsHub", () => {
  it("shows when null, true, or undefined", () => {
    expect(townIncludedOnTownsHub(null)).toBe(true);
    expect(townIncludedOnTownsHub(true)).toBe(true);
    expect(townIncludedOnTownsHub(undefined)).toBe(true);
  });

  it("hides only when explicitly false", () => {
    expect(townIncludedOnTownsHub(false)).toBe(false);
  });
});
