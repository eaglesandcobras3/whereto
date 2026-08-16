import { describe, expect, it } from "vitest";
import {
  listingInDiscoverBbox,
  parseDiscoverBbox,
  parseDiscoverZoom,
  serializeDiscoverBbox,
} from "@/lib/discovery-filters/discover-bbox";

describe("parseDiscoverBbox", () => {
  it("parses south,west,north,east", () => {
    expect(parseDiscoverBbox("30.2,-86.3,30.4,-86.0")).toEqual({
      south: 30.2,
      west: -86.3,
      north: 30.4,
      east: -86,
    });
  });

  it("rejects inverted or incomplete boxes", () => {
    expect(parseDiscoverBbox("30.4,-86.3,30.2,-86.0")).toBeNull();
    expect(parseDiscoverBbox("30.2,-86.3")).toBeNull();
  });
});

describe("serializeDiscoverBbox", () => {
  it("round-trips with fixed precision", () => {
    const raw = serializeDiscoverBbox({
      south: 30.123456,
      west: -86.987654,
      north: 30.234567,
      east: -86.876543,
    });
    expect(raw).toBe("30.12346,-86.98765,30.23457,-86.87654");
    expect(parseDiscoverBbox(raw)).toEqual({
      south: 30.12346,
      west: -86.98765,
      north: 30.23457,
      east: -86.87654,
    });
  });
});

describe("parseDiscoverZoom", () => {
  it("accepts 8–20", () => {
    expect(parseDiscoverZoom("14")).toBe(14);
    expect(parseDiscoverZoom("7")).toBeUndefined();
  });
});

describe("listingInDiscoverBbox", () => {
  const bbox = { south: 30.2, west: -86.3, north: 30.4, east: -86.0 };

  it("includes points inside the box", () => {
    expect(listingInDiscoverBbox(30.3, -86.15, bbox)).toBe(true);
  });

  it("excludes missing coords and outside points", () => {
    expect(listingInDiscoverBbox(null, -86.15, bbox)).toBe(false);
    expect(listingInDiscoverBbox(30.5, -86.15, bbox)).toBe(false);
  });
});
