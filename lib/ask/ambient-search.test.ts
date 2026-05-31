import { describe, expect, it } from "vitest";
import {
  applyAmbientToSearchQuery,
  hasExplicitMealPeriod,
  isVagueFoodQuery,
  matchRelevantEvents,
} from "@/lib/ask/ambient-search";
import type { AmbientContext } from "@/lib/ask/ambient-context";
import { deriveSessionHints } from "@/lib/ask/session-context";
import { buildClarifyingQuestions } from "@/lib/ask/clarifying-questions";
import { detectQueryThemes } from "@/lib/ask/search-input";

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

describe("applyAmbientToSearchQuery", () => {
  it("steers vague afternoon eat query toward storm-safe options", () => {
    const q = "where should we eat";
    const themes = detectQueryThemes(q);
    const result = applyAmbientToSearchQuery(q, themes, mockAmbient({}));
    expect(result.toLowerCase()).toMatch(/indoor|cafe|storm|light bite/);
    expect(isVagueFoodQuery(q)).toBe(true);
    expect(hasExplicitMealPeriod(result)).toBe(false);
  });

  it("infers breakfast for morning vague food asks", () => {
    const q = "somewhere to eat";
    const themes = detectQueryThemes(q);
    const ambient = mockAmbient({
      timeOfDay: "morning",
      hourLocal: 8,
      stormWindow: false,
      suggestLightBite: false,
      impliedMealPeriod: "breakfast",
      preferCoffeePeak: true,
    });
    const result = applyAmbientToSearchQuery(q, themes, ambient);
    expect(result.toLowerCase()).toContain("breakfast");
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
  it("skips location question when user asks what else is nearby", () => {
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

    const questions = buildClarifyingQuestions(
      "what else is nearby?",
      true,
      mockAmbient({ stormWindow: false, suggestLightBite: false }),
      hints,
    );
    expect(questions.some((q) => q.id === "location")).toBe(false);
  });

  it("skips dietary question when session already has gluten-free", () => {
    const hints = deriveSessionHints({
      message: "restaurants near seaside",
      activeFilters: { dietary_tags: ["gluten_free"] },
      searchContext: { lastQuery: "", lastTool: null, resultCount: 0 },
      refinementHistory: [],
    });
    const questions = buildClarifyingQuestions(
      "restaurants near seaside",
      true,
      mockAmbient({ stormWindow: false, suggestLightBite: false, impliedMealPeriod: "dinner" }),
      hints,
    );
    expect(questions.some((q) => q.id === "dietary")).toBe(false);
  });
});

describe("buildClarifyingQuestions time-aware", () => {
  it("skips meal period at 3pm when storm window is active", () => {
    const questions = buildClarifyingQuestions(
      "where should we eat",
      true,
      mockAmbient({}),
    );
    expect(questions.some((q) => q.id === "meal_period")).toBe(false);
  });
});
