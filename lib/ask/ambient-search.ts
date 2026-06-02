import type { AmbientContext, TimeOfDay, TodayEvent } from "@/lib/ask/ambient-context";
import type { DiscoveryStrategy } from "@/lib/ask/discovery-strategies";
import type { AskQueryThemes } from "@/lib/ask/search-input";
import { enrichQueryForContext } from "@/lib/ask/search-input";
import type { SearchIntent } from "@/lib/intent-schema";

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
 * Weather-only query hints (never time-of-day — that uses {@link planAmbientTimeStrategies}).
 */
export function applyAmbientToSearchQuery(
  rawQuery: string,
  themes: AskQueryThemes,
  ambient: AmbientContext,
): string {
  let q = rawQuery;
  const { searchSignals } = ambient;

  if (searchSignals.preferCold && (themes.treats || themes.iceCream || themes.coffee)) {
    q = enrichQueryForContext(`${q} cold refreshing`);
  }

  if (searchSignals.preferIndoor && themes.activities) {
    q = enrichQueryForContext(`${q} indoor`);
  }

  return q.trim();
}

/** Overlay meal period from clock time onto intent — does not mutate the user's query text. */
export function mergeAmbientMealPeriodIntoIntent(
  intent: SearchIntent,
  ambient: AmbientContext | undefined,
  verbatimQuery: string,
): SearchIntent {
  if (!ambient) return intent;
  const period = ambient.searchSignals.impliedMealPeriod;
  if (
    period &&
    !intent.meal_period &&
    !hasExplicitMealPeriod(verbatimQuery) &&
    isVagueFoodQuery(verbatimQuery)
  ) {
    return { ...intent, meal_period: period };
  }
  return intent;
}

/**
 * Optional parallel search passes driven by time-of-day (not appended to query string).
 */
export function planAmbientTimeStrategies(
  ambient: AmbientContext,
  themes: AskQueryThemes,
  verbatimQuery: string,
  opts?: { facetMealPeriod?: string | null },
): DiscoveryStrategy[] {
  const strategies: DiscoveryStrategy[] = [];
  const { searchSignals } = ambient;
  const vagueFood = isVagueFoodQuery(verbatimQuery);
  const hasMeal =
    hasExplicitMealPeriod(verbatimQuery) || Boolean(opts?.facetMealPeriod);

  const push = (s: DiscoveryStrategy) => {
    if (strategies.some((x) => x.id === s.id)) return;
    strategies.push(s);
  };

  if (vagueFood && !hasMeal && searchSignals.impliedMealPeriod) {
    const period = searchSignals.impliedMealPeriod;
    const byPeriod: Record<
      string,
      { label: string; matchHint: string; categorySlug: string | null }
    > = {
      breakfast: {
        label: "Breakfast (time of day)",
        matchHint: "breakfast / brunch — morning window",
        categorySlug: "restaurants",
      },
      lunch: {
        label: "Lunch (time of day)",
        matchHint: "lunch — midday window",
        categorySlug: "restaurants",
      },
      dinner: {
        label: "Dinner (time of day)",
        matchHint: "dinner — evening window",
        categorySlug: "restaurants",
      },
      late_night: {
        label: "Late night (time of day)",
        matchHint: "late night food & drinks",
        categorySlug: "restaurants",
      },
    };
    const meta = byPeriod[period];
    if (meta) {
      push({
        id: `ambient_meal_${period}`,
        label: meta.label,
        rawQuery: verbatimQuery,
        categorySlug: meta.categorySlug,
        weight: 0.84,
        matchHint: meta.matchHint,
      });
    }
  }

  if (searchSignals.happyHour && (themes.bars || vagueFood)) {
    push({
      id: "ambient_happy_hour",
      label: "Happy hour (time of day)",
      rawQuery: verbatimQuery,
      categorySlug: "bars",
      weight: 0.86,
      matchHint: "happy hour / golden hour drinks",
    });
  }

  if (searchSignals.preferNightlife && themes.bars) {
    push({
      id: "ambient_nightlife",
      label: "Nightlife (time of day)",
      rawQuery: verbatimQuery,
      categorySlug: "bars",
      weight: 0.84,
      matchHint: "bars & late night",
    });
  }

  return strategies;
}

/** Merge core discovery strategies with ambient time passes (deduped, capped). */
export function mergeDiscoveryStrategies(
  core: DiscoveryStrategy[],
  ambient: DiscoveryStrategy[],
  max = 5,
): DiscoveryStrategy[] {
  const out = [...core];
  for (const s of ambient) {
    if (out.length >= max) break;
    if (!out.some((x) => x.id === s.id)) out.push(s);
  }
  return out.slice(0, max);
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
