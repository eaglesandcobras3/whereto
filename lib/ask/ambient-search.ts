import type { AmbientContext, TimeOfDay, TodayEvent } from "@/lib/ask/ambient-context";
import type { AskQueryThemes } from "@/lib/ask/search-input";
import { enrichQueryForContext } from "@/lib/ask/search-input";

export type AmbientRankBoosts = {
  preferHiddenGem: boolean;
  preferIndoor: boolean;
  preferCoffeeMorning: boolean;
  preferHappyHour: boolean;
  preferNightlife: boolean;
  preferLightBite: boolean;
};

const MEAL_PATTERN =
  /\b(breakfast|brunch|lunch|dinner|late\s+night|supper|morning meal|evening meal)\b/i;

const VAGUE_FOOD =
  /\b(where (should|can|to) (we|i) eat|somewhere to eat|place to eat|hungry|where to eat|good to eat|food spot)\b/i;

export function hasExplicitMealPeriod(query: string): boolean {
  return MEAL_PATTERN.test(query);
}

export function isVagueFoodQuery(query: string): boolean {
  return VAGUE_FOOD.test(query) || /\b(restaurant|dining|meal)\b/i.test(query);
}

export function ambientRankBoostsFromContext(ctx: AmbientContext): AmbientRankBoosts {
  const { searchSignals, timeOfDay, hourLocal } = ctx;
  return {
    preferHiddenGem: searchSignals.avoidCrowded,
    preferIndoor: searchSignals.preferIndoor || searchSignals.stormWindow,
    preferCoffeeMorning: searchSignals.preferCoffeePeak,
    preferHappyHour: searchSignals.happyHour,
    preferNightlife: searchSignals.preferNightlife,
    preferLightBite: searchSignals.suggestLightBite,
  };
}

/**
 * Enrich search query from time-of-day, weather, and crowd — no extra API calls.
 */
export function applyAmbientToSearchQuery(
  rawQuery: string,
  themes: AskQueryThemes,
  ambient: AmbientContext,
): string {
  let q = rawQuery;
  const { searchSignals, timeOfDay } = ambient;
  const vagueFood = isVagueFoodQuery(q);
  const hasMeal = hasExplicitMealPeriod(q);

  if (searchSignals.preferCold && (themes.treats || themes.iceCream || themes.coffee)) {
    q = enrichQueryForContext(`${q} cold refreshing`);
  }

  if (searchSignals.preferIndoor && themes.activities) {
    q = enrichQueryForContext(`${q} indoor`);
  }

  // Time-of-day meal inference for vague "where to eat" asks
  if (vagueFood && !hasMeal && searchSignals.impliedMealPeriod) {
    q = enrichQueryForContext(`${q} ${searchSignals.impliedMealPeriod}`);
  }

  // Afternoon storm window: steer toward cafés / covered patios, not full dinner
  if (searchSignals.stormWindow && (vagueFood || themes.dining) && !hasMeal) {
    q = enrichQueryForContext(`${q} indoor covered patio café light bite wait out storm`);
  }

  if (searchSignals.happyHour && (themes.bars || vagueFood || timeOfDay === "golden_hour")) {
    q = enrichQueryForContext(`${q} happy hour`);
  }

  if (searchSignals.preferCoffeePeak && (themes.coffee || vagueFood)) {
    q = enrichQueryForContext(`${q} coffee café morning`);
  }

  if (searchSignals.preferNightlife && (themes.bars || vagueFood)) {
    q = enrichQueryForContext(`${q} bar nightlife late night`);
  }

  if (timeOfDay === "midday" && vagueFood && !hasMeal) {
    q = enrichQueryForContext(`${q} lunch casual`);
  }

  return q.trim();
}

const EVENT_TOWN =
  /\b(seaside|rosemary|alys|watercolor|watersound|seagrove|grayton|santa\s*rosa|inlet|blue\s*mountain|gulf\s*place|30a)\b/i;

/** Events relevant to the user's query or known town (e.g. Saturday farmers market). */
export function matchRelevantEvents(
  events: TodayEvent[],
  query: string,
  knownTown?: string,
): TodayEvent[] {
  if (!events.length) return [];

  const q = `${query} ${knownTown ?? ""}`.toLowerCase();
  const queryTown = knownTown?.toLowerCase() ?? q.match(EVENT_TOWN)?.[0];

  return events.filter((e) => {
    const title = e.title.toLowerCase();
    const loc = (e.locationName ?? "").toLowerCase();

    if (/\b(farmers?\s*market|market|festival|concert|live music)\b/i.test(q)) {
      if (/\b(market|festival|concert|music)\b/i.test(title)) return true;
    }

    if (queryTown && loc.includes(queryTown.replace(/\s+/g, ""))) return true;
    if (queryTown && loc.includes(queryTown.split(/\s+/)[0] ?? "")) return true;

    if (q.split(/\s+/).some((word) => word.length > 4 && title.includes(word))) return true;

    return false;
  });
}

export function formatRelevantEventsForDiscovery(events: TodayEvent[]): string | undefined {
  if (!events.length) return undefined;
  const lines = events.slice(0, 3).map((e) => {
    const where = e.locationName ? ` at ${e.locationName}` : "";
    const when = e.timeLabel ? ` (${e.timeLabel})` : e.isRecurring ? " (weekly)" : "";
    return `${e.title}${where}${when}`;
  });
  return `Also happening today: ${lines.join(" • ")}`;
}

/** Text boost signals for rankMergedDiscoveryResults. */
export function listingMatchesAmbientBoost(
  rec: {
    business: {
      name: string;
      tags?: string[];
      ai_summary?: string | null;
      category_name?: string | null;
    };
    explanation: string;
  },
  boosts: AmbientRankBoosts,
): number {
  const tags = (rec.business.tags ?? []).map((t) => t.toLowerCase());
  const text = `${rec.business.name} ${rec.explanation} ${rec.business.ai_summary ?? ""} ${rec.business.category_name ?? ""}`.toLowerCase();
  let score = 0;

  if (boosts.preferHiddenGem) {
    if (tags.some((t) => t.includes("hidden") || t.includes("local_favorite"))) score += 0.09;
    if (/\b(local favorite|hidden gem|off the beaten|neighborhood)\b/.test(text)) score += 0.06;
  }

  if (boosts.preferIndoor) {
    if (tags.some((t) => t.includes("indoor"))) score += 0.07;
    if (/\b(indoor|covered patio|air.?condition|a\/c|gallery|bookstore|coffee)\b/.test(text)) score += 0.05;
  }

  if (boosts.preferCoffeeMorning) {
    if (/\b(coffee|cafe|café|espresso|bakery|breakfast)\b/.test(text)) score += 0.06;
  }

  if (boosts.preferHappyHour) {
    if (/\b(happy hour|waterfront|sunset|bar|cocktail|patio)\b/.test(text)) score += 0.07;
  }

  if (boosts.preferNightlife) {
    if (/\b(bar|pub|nightlife|late night|cocktail|brewery)\b/.test(text)) score += 0.08;
  }

  if (boosts.preferLightBite) {
    if (/\b(cafe|café|coffee|bakery|ice cream|sandwich|light|snack|pastry)\b/.test(text)) score += 0.06;
  }

  return score;
}

export function timeOfDayLabel(tod: TimeOfDay): string {
  switch (tod) {
    case "morning":
      return "7–10am breakfast & coffee peak";
    case "midday":
      return "11am–2pm beach & light lunch";
    case "afternoon":
      return "2–5pm storm window — indoor/café";
    case "golden_hour":
      return "5–8pm happy hour & early dinner";
    case "evening":
      return "dinner rush";
    case "night":
      return "8pm+ bars & late night";
  }
}
