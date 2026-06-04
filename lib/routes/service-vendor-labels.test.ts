import { describe, expect, it } from "vitest";
import {
  LEGACY_SERVICE_VENDOR_SPECIALTY_PARAM,
  parseSpecialtySlugsFromParams,
  SERVICE_VENDOR_SPECIALTY_PARAM,
  setSpecialtySlugsOnParams,
} from "@/lib/routes/service-vendor-labels";

describe("parseSpecialtySlugsFromParams", () => {
  it("reads specialty param", () => {
    expect(
      parseSpecialtySlugsFromParams((key) =>
        key === SERVICE_VENDOR_SPECIALTY_PARAM ? "plumbing,hvac" : null,
      ),
    ).toEqual(["plumbing", "hvac"]);
  });

  it("falls back to legacy service_category", () => {
    expect(
      parseSpecialtySlugsFromParams((key) =>
        key === LEGACY_SERVICE_VENDOR_SPECIALTY_PARAM ? "cleaning" : null,
      ),
    ).toEqual(["cleaning"]);
  });

  it("prefers specialty over legacy", () => {
    expect(
      parseSpecialtySlugsFromParams((key) => {
        if (key === SERVICE_VENDOR_SPECIALTY_PARAM) return "plumbing";
        if (key === LEGACY_SERVICE_VENDOR_SPECIALTY_PARAM) return "cleaning";
        return null;
      }),
    ).toEqual(["plumbing"]);
  });
});

describe("setSpecialtySlugsOnParams", () => {
  it("writes specialty and clears legacy", () => {
    const params = new URLSearchParams({ [LEGACY_SERVICE_VENDOR_SPECIALTY_PARAM]: "old" });
    setSpecialtySlugsOnParams(params, ["landscaping"]);
    expect(params.get(SERVICE_VENDOR_SPECIALTY_PARAM)).toBe("landscaping");
    expect(params.get(LEGACY_SERVICE_VENDOR_SPECIALTY_PARAM)).toBeNull();
  });
});
