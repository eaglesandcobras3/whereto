import { describe, expect, it } from "vitest";
import { LEGACY_AREA_REDIRECTS } from "./legacy-area-redirects";

describe("LEGACY_AREA_REDIRECTS", () => {
  it("maps the GSC-reported gulf place guide slug to the town page", () => {
    expect(LEGACY_AREA_REDIRECTS).toEqual(
      expect.arrayContaining([
        {
          source: "/area/gulf-place-town-center-guide",
          destination: "/town/gulf-place",
        },
      ]),
    );
  });
});
