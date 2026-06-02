import { describe, expect, it } from "vitest";
import {
  applyAmbientToSearchQuery,
  hasExplicitMealPeriod,
  isVagueFoodQuery,
  matchRelevantEvents,
  planAmbientTimeStrategies,
} from "@/lib/ask/ambient-search";
import type { AmbientContext } from "@/lib/ask/ambient-context";
import { deriveSessionHints } from "@/lib/ask/session-context";
import { detectQueryThemes, extractTownFromText } from "@/lib/ask/search-input";

function mockAmbient(overrides: Partial<AmbientContext["searchSignals"]> & {
  timeOfDay?: AmbientContext["timeOfDay"];
  hourLocal?: number;
  todayEvents?: AmbientContext["todayEvents"];
}): AmbientContext {
  return {
    weather: {
      condition: "clear",
      temperatureF: 88,
      isHot: true,
      isVeryHot: false,
      isRainy: false,
      isStormy: false,
      isCool: false,
    },
    timeOfDay: overrides.timeOfDay ?? "afternoon",
    hourLocal: overrides.hourLocal ?? 15,
    season: "peak_summer",
    crowdLevel: "very_busy",
    isPeakWeekend: false,
    dayOfWeek: 6,
    todayEvents: overrides.todayEvents ?? [],
    contextHints: [],
    searchSignals: {
      preferIndoor: true,
      preferCold: true,
      preferShaded: false,
      avoidCrowded: true,
      seasonClosed: false,
      impliedMealPeriod: null,
      stormWindow: true,
      happyHour: false,
      preferCoffeePeak: false,
      preferNightlife: false,
      suggestLightBite: true,
      ...overrides,
    },
    fetchedAt: Date.now(),
  };
}

describe("detectQueryThemes", () => {
  it("does not treat Rosemary Beach as an activities query", () => {
    const themes = detectQueryThemes(
      "coffee with treats for kids in Rosemary Beach",
    );
    expect(themes.activities).toBe(false);
    expect(themes.coffee).toBe(true);
  });

  it("extracts town names from clarify answers", () => {
    expect(extractTownFromText("Rosemary Beach. Bakery item")).toBe("Rosemary Beach");
  });
});

describe("applyAmbientToSearchQuery", () => {
  it("does not append time-of-day words to specific coffee queries", () => {
    const q = "looking for coffee with treats for kids in Rosemary Beach";
    const themes = detectQueryThemes(q);
    const ambient = mockAmbient({
      timeOfDay: "morning",
      impliedMealPeriod: "breakfast",
      preferCoffeePeak: true,
      preferCold: false,
    });
    const result = applyAmbientToSearchQuery(q, themes, ambient);
    expect(result).toBe(q);
    expect(result.toLowerCase()).not.toMatch(/\b(morning|breakfast|lunch|dinner|happy hour)\b/);
  });
});

describe("planAmbientTimeStrategies", () => {
  it("adds a breakfast strategy for vague morning food asks without changing query text", () => {
    const q = "somewhere to eat";
    const themes = detectQueryThemes(q);
    const ambient = mockAmbient({
      timeOfDay: "morning",
      impliedMealPeriod: "breakfast",
      preferCoffeePeak: true,
    });
    const strategies = planAmbientTimeStrategies(ambient, themes, q);
    expect(strategies.map((s) => s.id)).toContain("ambient_meal_breakfast");
    expect(strategies[0]?.rawQuery).toBe(q);
    expect(isVagueFoodQuery(q)).toBe(true);
    expect(hasExplicitMealPeriod(q)).toBe(false);
  });

  it("skips meal-period strategy when query already names a meal", () => {
    const q = "dinner near Seaside";
    const strategies = planAmbientTimeStrategies(
      mockAmbient({ impliedMealPeriod: "dinner" }),
      detectQueryThemes(q),
      q,
    );
    expect(strategies.map((s) => s.id)).not.toContain("ambient_meal_dinner");
  });
});

describe("matchRelevantEvents", () => {
  it("matches farmers market events to seaside queries", () => {
    const events = [
      {
        title: "Seaside Farmers Market",
        locationName: "Seaside Town Center",
        timeLabel: "9:00 AM",
        isRecurring: true,
      },
    ];
    expect(matchRelevantEvents(events, "things to do in Seaside", "Seaside")).toHaveLength(1);
  });
});

describe("deriveSessionHints", () => {
  it("sets isNearbyFollowUp when user asks what else is nearby with known town", () => {
    const hints = deriveSessionHints({
      message: "what else is nearby?",
      activeFilters: { town_or_area: "Rosemary Beach", query: "coffee" },
      searchContext: {
        lastQuery: "coffee near Rosemary Beach",
        lastTool: "searchBusinesses",
        resultCount: 5,
      },
      refinementHistory: [],
    });
    expect(hints.knownTown).toBe("Rosemary Beach");
    expect(hints.isNearbyFollowUp).toBe(true);
  });
});
