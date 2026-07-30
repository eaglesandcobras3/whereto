import { describe, expect, it } from "vitest";
import {
  isTemplatedTownSeoTitle,
  jaccardOverlap,
  overlapTokens,
} from "./content-overlap";
import type { TownIrseInput } from "./inputs";
import { scoreFromInput } from "./score-from-input";

function town(overrides: Partial<TownIrseInput> = {}): TownIrseInput {
  return {
    kind: "town",
    slug: "seaside",
    title: "Seaside",
    excerpt: "A walkable beach town with a pastel square and gulf access.",
    content: "Seaside’s town center is built around Central Square. ".repeat(40),
    seo_title: "Seaside on 30A: beach town square, cottages, and gulf access",
    seo_description:
      "Plan Seaside on 30A — town square dining, beach access, cottages, and nearby stops along Scenic Highway 30A.",
    hero_image: "img-1",
    main_image: null,
    hero_image_url: null,
    main_image_url: null,
    status: "published",
    listing_count: 40,
    guide_count: 1,
    area_count: 2,
    content_overlap_max: 0.18,
    seo_title_templated: false,
    has_planning_profile: true,
    planning_faq_count: 3,
    planning_nearby_count: 2,
    ...overrides,
  };
}

describe("content-overlap helpers", () => {
  it("detects templated town SEO titles", () => {
    expect(
      isTemplatedTownSeoTitle(
        "Watersound Florida: Where to Stay, Eat, Beach and Explore on 30A",
      ),
    ).toBe(true);
    expect(isTemplatedTownSeoTitle("Seaside on 30A: beach town square and gulf access")).toBe(
      false,
    );
  });

  it("computes jaccard overlap", () => {
    const a = overlapTokens("seaside square pastel cottages gulf beach");
    const b = overlapTokens("seaside square pastel cottages rosemary beach");
    expect(jaccardOverlap(a, b)).toBeGreaterThan(0.4);
  });
});

describe("scoreFromInput town calibration", () => {
  it("scores a distinctive town as index-ready", () => {
    const result = scoreFromInput(town());
    expect(result.overallScore).toBeGreaterThanOrEqual(80);
    expect(result.indexReady).toBe(true);
    expect(result.flags.some((f) => f.code === "content_near_duplicate")).toBe(false);
  });

  it("does not mark templated near-duplicate towns index-ready", () => {
    const result = scoreFromInput(
      town({
        slug: "watersound",
        title: "Watersound",
        seo_title: "Watersound Florida: Where to Stay, Eat, Beach and Explore on 30A",
        seo_title_templated: true,
        content_overlap_max: 0.47,
        guide_count: 0,
        area_count: 1,
        listing_count: 29,
      }),
    );
    expect(result.overallScore).toBeLessThan(80);
    expect(result.indexReady).toBe(false);
    expect(result.flags.some((f) => f.code === "seo_templated_title")).toBe(true);
    expect(result.flags.some((f) => f.code === "content_near_duplicate")).toBe(true);
    expect(result.flags.some((f) => f.code === "discovery_few_guides")).toBe(true);
  });
});
