import { describe, expect, it } from "vitest";
import { parseLabelRoute, parseKindSlugLabel } from "./parse-label-route";

describe("parseLabelRoute", () => {
  it("parses business / guide / town / area paths", () => {
    expect(parseLabelRoute("/business/amavida-coffee")).toEqual({
      kind: "business",
      slug: "amavida-coffee",
      path: "/business/amavida-coffee",
    });
    expect(parseLabelRoute("/guide/first-timers-30a")).toMatchObject({
      kind: "guide",
      slug: "first-timers-30a",
    });
    expect(parseLabelRoute("/town/seaside")).toMatchObject({ kind: "town", slug: "seaside" });
    expect(parseLabelRoute("/area/rosemary-beach")).toMatchObject({
      kind: "area",
      slug: "rosemary-beach",
    });
  });

  it("parses absolute URLs", () => {
    expect(
      parseLabelRoute("https://whereto30a.com/business/foo-bar?x=1"),
    ).toMatchObject({ kind: "business", slug: "foo-bar" });
  });

  it("parses category hubs", () => {
    expect(parseLabelRoute("/restaurants")).toMatchObject({
      kind: "category",
      slug: "restaurants",
    });
    expect(parseLabelRoute("/coffee-shops")).toMatchObject({
      kind: "category",
      slug: "coffee_shops",
    });
  });

  it("returns null for unknown paths", () => {
    expect(parseLabelRoute("/")).toBeNull();
    expect(parseLabelRoute("/discover")).toBeNull();
    expect(parseLabelRoute("")).toBeNull();
  });
});

describe("parseKindSlugLabel", () => {
  it("accepts explicit kind + slug", () => {
    expect(parseKindSlugLabel("business", "foo")).toEqual({
      kind: "business",
      slug: "foo",
      path: "/business/foo",
    });
  });
});
