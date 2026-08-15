import { describe, expect, it } from "vitest";
import { parseAreaFacts, type AreaFactsRow } from "@/lib/data/area-facts";
import {
  isAreaFactsEnabled,
  resolveFeatureFlags,
} from "@/lib/feature-flags-core";

const completeRow: AreaFactsRow = {
  at_a_glance_description:
    "Cobblestone loop of shops and restaurants — where Rosemary actually gathers.",
  walkability_rating: "High",
  walkability_subtext: "Compact town-center loop",
  beach_type: "Few blocks south",
  beach_type_subtext: "Short walk through neighborhood streets",
  dining_rating: "Walkable",
  dining_subtext: "Coffee to upscale dinner",
  getting_around_summary: "Walk • Bike",
  getting_around_subtext: "Car rarely needed in the center",
  highlights: ["Walkable shopping", "Dinner without driving", "Evening strolls"],
  beach_access_details:
    "The town center sits inland from the sand. Beach access is a short walk south.",
  getting_around_details: "Built for walking and biking inside the center.",
  dining_town_center_details:
    "Coffee to upscale dinner on foot. Most guests eat here multiple nights without getting in the car.",
  parking_details:
    "Town-center lots fill on summer weekends. Walking from your rental beats circling if you're staying nearby.",
};

describe("area_facts flag", () => {
  it("defaults area_facts on", () => {
    expect(isAreaFactsEnabled(resolveFeatureFlags({}))).toBe(true);
  });

  it("allows PostHog to turn area_facts off", () => {
    expect(isAreaFactsEnabled(resolveFeatureFlags({ area_facts: false }))).toBe(false);
  });

  it("enables when PostHog flag is true", () => {
    expect(isAreaFactsEnabled(resolveFeatureFlags({ area_facts: true }))).toBe(true);
  });
});

describe("parseAreaFacts", () => {
  it("returns null when required fields are missing", () => {
    expect(parseAreaFacts(null)).toBeNull();
    expect(
      parseAreaFacts({
        ...completeRow,
        parking_details: null,
      }),
    ).toBeNull();
  });

  it("maps a complete row into metrics, highlights, and details", () => {
    const facts = parseAreaFacts(completeRow);
    expect(facts).not.toBeNull();
    expect(facts?.description).toContain("Cobblestone loop");
    expect(facts?.metrics).toHaveLength(3);
    expect(facts?.highlights).toHaveLength(3);
    expect(facts?.details.map((d) => d.title)).toEqual([
      "Dining & Town Center",
      "Parking",
    ]);
  });
});
