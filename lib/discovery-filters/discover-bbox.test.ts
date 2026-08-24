import { describe, expect, it } from "vitest";
import {
  bboxAroundMapPoints,
  listingInDiscoverBbox,
  locateViewportFromPoint,
  parseDiscoverBbox,
  parseDiscoverZoom,
  pointInDiscoverLocateEnvelope,
  serializeDiscoverBbox,
  townJumpZoom,
  TOWN_JUMP_ZOOM_SINGLE,
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

describe("bboxAroundMapPoints", () => {
  it("builds a padded box around a town center", () => {
    const bbox = bboxAroundMapPoints([{ lat: 30.32, lng: -86.13 }], 2.5);
    expect(bbox).not.toBeNull();
    expect(bbox!.south).toBeLessThan(30.32);
    expect(bbox!.north).toBeGreaterThan(30.32);
    expect(bbox!.west).toBeLessThan(-86.13);
    expect(bbox!.east).toBeGreaterThan(-86.13);
    expect(listingInDiscoverBbox(30.32, -86.13, bbox!)).toBe(true);
  });

  it("spans multiple centers", () => {
    const bbox = bboxAroundMapPoints(
      [
        { lat: 30.28, lng: -86.0 },
        { lat: 30.35, lng: -86.2 },
      ],
      1,
    );
    expect(bbox).not.toBeNull();
    expect(bbox!.south).toBeLessThan(30.28);
    expect(bbox!.north).toBeGreaterThan(30.35);
    expect(bbox!.west).toBeLessThan(-86.2);
    expect(bbox!.east).toBeGreaterThan(-86.0);
  });

  it("returns null for empty input", () => {
    expect(bboxAroundMapPoints([])).toBeNull();
  });
});

describe("townJumpZoom", () => {
  it("zooms in for a single town and out for many", () => {
    expect(townJumpZoom(1)).toBe(16);
    expect(townJumpZoom(3)).toBe(14);
  });
});

describe("pointInDiscoverLocateEnvelope", () => {
  it("includes 30A, Destin, and Panama City Beach", () => {
    expect(pointInDiscoverLocateEnvelope(30.321, -86.141)).toBe(true);
    expect(pointInDiscoverLocateEnvelope(30.393, -86.495)).toBe(true);
    expect(pointInDiscoverLocateEnvelope(30.176, -85.805)).toBe(true);
  });

  it("excludes far-off points", () => {
    expect(pointInDiscoverLocateEnvelope(33.749, -84.388)).toBe(false);
  });
});

describe("locateViewportFromPoint", () => {
  it("uses single-town jump zoom and a padded bbox", () => {
    const viewport = locateViewportFromPoint(30.32, -86.13);
    expect(viewport).not.toBeNull();
    expect(viewport!.zoom).toBe(TOWN_JUMP_ZOOM_SINGLE);
    expect(listingInDiscoverBbox(30.32, -86.13, viewport!.bbox)).toBe(true);
  });
});
