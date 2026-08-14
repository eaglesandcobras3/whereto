import { describe, expect, it } from "vitest";
import {
  censusAddressQuery,
  parseCensusGeocodeResponse,
  shouldGeocodeRow,
} from "./census-geocode";

describe("parseCensusGeocodeResponse", () => {
  it("maps Census x/y to lng/lat", () => {
    const match = parseCensusGeocodeResponse({
      result: {
        addressMatches: [
          {
            matchedAddress: "2236 E COUNTY HWY 30A, SEASIDE, FL, 32459",
            coordinates: { x: -86.164, y: 30.32 },
          },
        ],
      },
    });
    expect(match).toEqual({
      lat: 30.32,
      lng: -86.164,
      matchedAddress: "2236 E COUNTY HWY 30A, SEASIDE, FL, 32459",
    });
  });

  it("returns null when there is no match", () => {
    expect(parseCensusGeocodeResponse({ result: { addressMatches: [] } })).toBeNull();
  });
});

describe("censusAddressQuery", () => {
  it("appends town and FL when missing", () => {
    expect(censusAddressQuery("2236 E County Hwy 30A", "Seaside")).toBe(
      "2236 E County Hwy 30A, Seaside, FL",
    );
  });
});

describe("shouldGeocodeRow", () => {
  it("geocodes storefronts with an address and missing pins", () => {
    expect(
      shouldGeocodeRow(
        {
          is_storefront: "true",
          location: "123 Main St",
          map_lat: "",
          map_lng: "",
          audit_status: "exists",
        },
        false,
      ),
    ).toBe(true);
  });

  it("overwrites existing pins when overwrite is true", () => {
    expect(
      shouldGeocodeRow(
        {
          is_storefront: "true",
          location: "123 Main St",
          map_lat: "30.1",
          map_lng: "-86.1",
          audit_status: "exists",
        },
        true,
      ),
    ).toBe(true);
    expect(
      shouldGeocodeRow(
        {
          is_storefront: "true",
          location: "123 Main St",
          map_lat: "30.1",
          map_lng: "-86.1",
          audit_status: "skipped_verified",
        },
        false,
      ),
    ).toBe(false);
  });

  it("skips unconfirmed rows and service-only listings", () => {
    expect(
      shouldGeocodeRow(
        {
          is_storefront: "true",
          location: "123 Main St",
          audit_status: "cannot_confirm",
        },
        true,
      ),
    ).toBe(false);
    expect(
      shouldGeocodeRow(
        {
          is_storefront: "false",
          is_service_business: "true",
          location: "123 Main St",
        },
        true,
      ),
    ).toBe(false);
  });
});
