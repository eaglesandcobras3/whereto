import { describe, expect, it } from "vitest";
import type { BusinessIrseInput, CategoryIrseInput, GuideIrseInput } from "./inputs";
import { scoreFromInput } from "./score-from-input";

function strongBusiness(overrides: Partial<BusinessIrseInput> = {}): BusinessIrseInput {
  return {
    kind: "business",
    slug: "amavida-coffee-roasters-seaside",
    title: "Amavida Coffee Roasters",
    address: "25 Central Square, Seaside, FL",
    phone: "850-555-0100",
    website: "https://example.com",
    hours: "Mon-Sun 7am-5pm",
    excerpt:
      "A Seaside coffee counter where locals grab espresso before the beach — small-batch beans roasted nearby.",
    content:
      "Order the cortado and sit on the square. Mornings stay calm until the rental crowd arrives. Parking is easier two blocks north of the circle.",
    overview: "Local coffee roaster on the Seaside square with patio seating.",
    seo_title: "Amavida Coffee Roasters in Seaside | WhereTo30A",
    seo_description:
      "Local coffee and small-batch espresso on the Seaside square — hours, tips, and nearby stops.",
    town_id: "t1",
    town_slug: "seaside",
    town_title: "Seaside",
    area_id: "a1",
    area_slug: "seaside-square",
    primary_category_id: "c1",
    category_slug: "coffee_shops",
    map_lat: 30.32,
    map_lng: -86.14,
    hero_image: "img-1",
    main_image: null,
    hero_image_url: null,
    main_image_url: null,
    claim_status: "claimed",
    status: "published",
    is_hidden_from_search: false,
    date_updated: new Date().toISOString(),
    published_at: new Date().toISOString(),
    linked_from_town: true,
    linked_from_category: true,
    linked_from_guide: true,
    linked_from_area: true,
    similar_count: 3,
    guide_count: 2,
    likely_duplicate: false,
    ...overrides,
  };
}

describe("scoreFromInput business", () => {
  it("scores a strong listing index-ready", () => {
    const result = scoreFromInput(strongBusiness());
    expect(result.overallScore).toBeGreaterThanOrEqual(80);
    expect(result.indexReady).toBe(true);
    expect(result.path).toBe("/business/amavida-coffee-roasters-seaside");
    expect(result.scores.entity).toBeGreaterThan(80);
  });

  it("flags thin content and duplicates as critical", () => {
    const result = scoreFromInput(
      strongBusiness({
        excerpt: "Short",
        content: null,
        overview: null,
        likely_duplicate: true,
        linked_from_town: false,
        linked_from_guide: false,
        linked_from_area: false,
        similar_count: 0,
        guide_count: 0,
      }),
    );
    expect(result.overallScore).toBeLessThan(80);
    expect(result.flags.some((f) => f.code === "entity_duplicate")).toBe(true);
    expect(result.flags.some((f) => f.code === "content_thin")).toBe(true);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it("detects generic AI phrases", () => {
    const result = scoreFromInput(
      strongBusiness({
        content: "This hidden gem is nestled in the heart of 30A with something for everyone.",
      }),
    );
    expect(result.flags.some((f) => f.code === "content_generic_ai")).toBe(true);
  });
});

describe("scoreFromInput guide / category", () => {
  it("scores a published guide", () => {
    const input: GuideIrseInput = {
      kind: "guide",
      slug: "ultimate-30a-first-timers-guide",
      title: "Ultimate 30A First Timers Guide",
      guide_type: "trip",
      content: "A".repeat(1200),
      summary: "Plan your first 30A trip with town picks and beach tips.",
      excerpt: "First-timer advice for South Walton beaches and towns.",
      seo_title: "30A First Timers Guide",
      seo_description: "Plan a first trip to 30A with beach access tips, town vibes, and local picks.",
      og_title: null,
      og_description: null,
      hero_image: "g1",
      main_image: null,
      hero_image_url: null,
      main_image_url: null,
      status: "published",
      published_at: new Date().toISOString(),
      date_updated: new Date().toISOString(),
      town_link_count: 3,
      area_link_count: 1,
      business_link_count: 5,
      search_tags_count: 4,
    };
    const result = scoreFromInput(input);
    expect(result.path).toBe("/guide/ultimate-30a-first-timers-guide");
    expect(result.overallScore).toBeGreaterThan(50);
  });

  it("uses public_path for category hubs", () => {
    const input: CategoryIrseInput = {
      kind: "category",
      slug: "restaurants",
      title: "Restaurants",
      excerpt: "Find the best restaurants on 30A by town, from casual brunch to date-night dinners.",
      status: "published",
      public_path: "/restaurants",
      has_audit_metadata: true,
      listing_count: 40,
      town_coverage_count: 8,
      has_editorial_block: true,
    };
    const result = scoreFromInput(input);
    expect(result.path).toBe("/restaurants");
    expect(result.indexReady).toBe(true);
  });
});
