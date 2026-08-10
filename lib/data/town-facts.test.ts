import { describe, expect, it } from "vitest";
import {
  highlightIcon,
  parseTownFacts,
  type TownFactsRow,
} from "@/lib/data/town-facts";
import {
  isTownFactsEnabled,
  resolveFeatureFlags,
} from "@/lib/feature-flags-core";

const completeRow: TownFactsRow = {
  at_a_glance_description:
    "A walkable town center with cobblestone streets and dinner on foot.",
  walkability_rating: "Excellent",
  walkability_subtext: "Everything is close by",
  beach_type: "Private",
  beach_type_subtext: "Resident & guest access",
  dining_rating: "Extensive",
  dining_subtext: "Many options nearby",
  getting_around_summary: "Walk • Bike",
  getting_around_subtext: "No golf carts allowed",
  highlights: ["Boutique Shopping", "Walkable", "Events"],
  beach_access_details: "Beach access is a few blocks from the town center.",
  getting_around_details: "Built for walking and biking. Golf carts are not allowed.",
  dining_town_center_details: "Boutiques, coffee, and restaurants in a compact loop.",
  parking_details: "Town-center parking gets tight on busy weekends.",
};

describe("town_facts flag", () => {
  it("defaults town_facts on", () => {
    expect(isTownFactsEnabled(resolveFeatureFlags({}))).toBe(true);
  });

  it("allows PostHog to turn town_facts off", () => {
    expect(isTownFactsEnabled(resolveFeatureFlags({ town_facts: false }))).toBe(false);
  });

  it("enables when PostHog flag is true", () => {
    expect(isTownFactsEnabled(resolveFeatureFlags({ town_facts: true }))).toBe(true);
  });
});

describe("parseTownFacts", () => {
  it("returns null when required fields are missing", () => {
    expect(parseTownFacts(null)).toBeNull();
    expect(
      parseTownFacts({
        ...completeRow,
        walkability_rating: null,
      }),
    ).toBeNull();
    expect(
      parseTownFacts({
        ...completeRow,
        at_a_glance_description: "   ",
      }),
    ).toBeNull();
  });

  it("maps a complete row into metrics, highlights, and details", () => {
    const facts = parseTownFacts(completeRow);
    expect(facts).not.toBeNull();
    expect(facts?.description).toContain("walkable town center");
    expect(facts?.metrics).toHaveLength(3);
    expect(facts?.metrics[0]).toMatchObject({
      label: "Walkability",
      value: "Excellent",
      subtext: "Everything is close by",
      icon: "directions_walk",
    });
    expect(facts?.metrics[1]).toMatchObject({
      label: "Beach Access",
      value: "Private",
      icon: "beach_access",
    });
    expect(facts?.metrics[2]?.label).toBe("Getting Around");
    expect(facts?.highlights).toEqual(["Boutique Shopping", "Walkable", "Events"]);
    expect(facts?.details).toHaveLength(2);
    expect(facts?.details.map((d) => d.title)).toEqual([
      "Dining & Town Center",
      "Parking",
    ]);
  });

  it("tolerates empty optional subtexts and highlight noise", () => {
    const facts = parseTownFacts({
      ...completeRow,
      walkability_subtext: null,
      highlights: ["Fine Dining", "  ", null as unknown as string],
    });
    expect(facts?.metrics[0]?.subtext).toBe("");
    expect(facts?.highlights).toEqual(["Fine Dining"]);
  });
});

describe("highlightIcon", () => {
  it("maps known labels and falls back to star", () => {
    expect(highlightIcon("Boutique Shopping")).toBe("storefront");
    expect(highlightIcon("Bike Friendly")).toBe("directions_bike");
    expect(highlightIcon("Something New")).toBe("star");
  });
});
