import { describe, expect, it } from "vitest";
import { PRIMARY_EDITORIAL_GUIDE_SLUG } from "@/lib/seo/sitemap-strategy";
import {
  NON_SCORABLE_ROOT_PATHS,
  resolveLabelRoute,
  type LabelRouteLookup,
} from "./resolve-label-route";

function lookup(partial?: Partial<LabelRouteLookup>): LabelRouteLookup {
  return {
    townSlugs: new Set(partial?.townSlugs ?? ["grayton-beach", "alys-beach", "watersound"]),
    areaSlugs: new Set(partial?.areaSlugs ?? ["seaside-town-square"]),
    categorySlugs: new Set(
      partial?.categorySlugs ?? [
        "restaurants",
        "coffee_shops",
        "shopping",
        "apparel",
        "hvac",
        "beauty_and_wellness",
      ],
    ),
  };
}

describe("resolveLabelRoute", () => {
  it("maps root town aliases to /town/{slug}", () => {
    const r = resolveLabelRoute("https://whereto30a.com/grayton-beach", lookup());
    expect(r?.route).toEqual({
      kind: "town",
      slug: "grayton-beach",
      path: "/town/grayton-beach",
    });
    expect(r?.via).toMatch(/town alias/);
  });

  it("maps root area aliases to /area/{slug}", () => {
    const r = resolveLabelRoute("/seaside-town-square", lookup());
    expect(r?.route.kind).toBe("area");
    expect(r?.route.slug).toBe("seaside-town-square");
  });

  it("maps published category leaves at the root", () => {
    expect(resolveLabelRoute("/apparel", lookup())?.route).toMatchObject({
      kind: "category",
      slug: "apparel",
    });
    expect(resolveLabelRoute("/hvac", lookup())?.route).toMatchObject({
      kind: "category",
      slug: "hvac",
    });
    expect(resolveLabelRoute("/beauty-and-wellness", lookup())?.route).toMatchObject({
      kind: "category",
      slug: "beauty_and_wellness",
    });
  });

  it("keeps explicit business/guide paths", () => {
    expect(resolveLabelRoute("/business/foo", lookup())?.route).toEqual({
      kind: "business",
      slug: "foo",
      path: "/business/foo",
    });
  });

  it("redirects /guide hub to primary editorial guide", () => {
    const r = resolveLabelRoute("/guide", lookup());
    expect(r?.route.slug).toBe(PRIMARY_EDITORIAL_GUIDE_SLUG);
  });

  it("skips non-scorable hubs", () => {
    for (const p of ["/about", "/businesses", "/towns", "/areas", "/guides", "/"]) {
      expect(NON_SCORABLE_ROOT_PATHS.has(p) || resolveLabelRoute(p, lookup()) === null).toBe(
        true,
      );
      expect(resolveLabelRoute(p, lookup())).toBeNull();
    }
    expect(resolveLabelRoute("/services", lookup())).toBeNull();
  });

  it("prefers category over town when both could match", () => {
    const maps = lookup({
      townSlugs: new Set(["shopping"]),
      categorySlugs: new Set(["shopping"]),
    });
    expect(resolveLabelRoute("/shopping", maps)?.route.kind).toBe("category");
  });
});
