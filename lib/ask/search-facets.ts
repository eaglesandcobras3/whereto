/**
 * Search facet resolution — single place for "what angles to search" and
 * structured constraints (town, meal, vibe, dietary) that drive intent without OpenAI.
 */

import type { AmbientContext } from "@/lib/ask/ambient-context";
import {
  hasExplicitMealPeriod,
  isVagueFoodQuery,
} from "@/lib/ask/ambient-search";
import type { AskQueryThemes, TreatPreference } from "@/lib/ask/search-input";
import { detectTreatPreference, isCorridorPlaceholder } from "@/lib/ask/search-input";
import { extractTownFromNormalizedQuery } from "@/lib/ai/search-ai";
import type { SearchIntent } from "@/lib/intent-schema";

/** Relative priority when multiple facets are active (higher = primary user intent). */
export const FACET_PRIORITY: Record<SearchFacetId, number> = {
  coffee: 1,
  dining: 0.96,
  bars: 0.95,
  bakery: 0.93,
  donut: 0.93,
  ice_cream: 0.88,
  shopping: 0.95,
  activities: 0.95,
  services: 0.97,
};

/** Discovery strategy id for each facet (for merge ranking). */
export const FACET_STRATEGY_ID: Record<SearchFacetId, string> = {
  coffee: "coffee_shops",
  bakery: "bakery_restaurants",
  ice_cream: "dessert_sweets",
  donut: "bakery_donut",
  dining: "restaurants",
  bars: "bars",
  shopping: "shopping",
  activities: "activities",
  services: "services",
};

/** Canonical search angles — each maps to at most one discovery strategy. */
export type SearchFacetId =
  | "coffee"
  | "bakery"
  | "ice_cream"
  | "donut"
  | "dining"
  | "bars"
  | "shopping"
  | "activities"
  | "services";

export type SearchFacetConstraints = {
  townOrArea: string | null;
  locationRadius: "exact" | "near" | "anywhere";
  mealPeriod: "breakfast" | "brunch" | "lunch" | "dinner" | "late_night" | null;
  dietaryNeeds: string[];
  vibeTags: string[];
  occasion: string | null;
  priceLevel: number | null;
};

export type IntentSource = "facet_plan" | "keyword_heuristic" | "openai";

export type ResolvedSearchFacets = {
  /** Facets that will get a search pass. */
  active: SearchFacetId[];
  /** Explicit treat chip / phrase (if any). */
  explicitTreat: TreatPreference | null;
  /** Facets implied by keyword themes before mutex resolution. */
  signaled: SearchFacetId[];
  constraints: SearchFacetConstraints;
  /** When true, {@link buildIntentFromFacets} is sufficient — skip OpenAI intent parse. */
  planComplete: boolean;
};

/** Only one treat subtype runs when user (or query) specifies one explicitly. */
const TREAT_MUTEX: SearchFacetId[] = ["bakery", "ice_cream", "donut"];

/**
 * When user wants treats but didn't specify donut vs ice cream vs bakery,
 * run these passes in parallel. Change this list to change product behavior globally.
 */
const AMBIGUOUS_TREAT_FACETS: SearchFacetId[] = ["bakery", "ice_cream"];

const TREAT_PREFERENCE_TO_FACET: Record<TreatPreference, SearchFacetId> = {
  bakery: "bakery",
  ice_cream: "ice_cream",
  donut: "donut",
  coffee_sweet: "coffee",
};

const MEAL_PATTERN =
  /\b(breakfast|brunch|lunch|dinner|late\s+night|supper|morning meal|evening meal)\b/i;

const DIETARY_PATTERN =
  /\b(gluten[- ]?free|vegan|vegetarian|dairy[- ]?free|nut[- ]?free|pescatarian|kosher|halal)\b/gi;

const VAGUE_OPEN_ENDED =
  /\b(something fun|anything fun|surprise me|what should we do|ideas for|recommend something|not sure what)\b/i;

const FACET_PLAN_MAX_WORDS = 18;

function signaledFacetsFromThemes(themes: AskQueryThemes): SearchFacetId[] {
  const out = new Set<SearchFacetId>();
  if (themes.coffee) out.add("coffee");
  if (themes.bakery) out.add("bakery");
  if (themes.iceCream) out.add("ice_cream");
  if (themes.donuts) out.add("donut");
  if (themes.dining) out.add("dining");
  if (themes.bars) out.add("bars");
  if (themes.shopping) out.add("shopping");
  if (themes.activities) out.add("activities");
  if (themes.treats) {
    for (const f of AMBIGUOUS_TREAT_FACETS) out.add(f);
  }
  return [...out];
}

function resolveTreatFacets(
  themes: AskQueryThemes,
  explicit: TreatPreference | null,
): SearchFacetId[] {
  if (explicit) {
    const primary = TREAT_PREFERENCE_TO_FACET[explicit];
    if (explicit === "coffee_sweet") {
      return ["coffee", "bakery"];
    }
    return [primary];
  }

  if (themes.iceCream) return ["ice_cream"];
  if (themes.donuts) return ["donut"];
  if (themes.bakery) return ["bakery"];
  if (themes.treats) return [...AMBIGUOUS_TREAT_FACETS];
  return [];
}

function resolveServiceFacet(
  effectiveQuery: string,
  toolCategorySlug: string | null,
): SearchFacetId | null {
  if (toolCategorySlug === "services") return "services";
  if (
    /\b(photographer|photography|private\s+chef|catering|massage|therapist|hair|stylist|wedding|event\s+planner)\b/i.test(
      effectiveQuery,
    )
  ) {
    return "services";
  }
  return null;
}

function applyMutexGroups(
  signaled: Set<SearchFacetId>,
  treatFacets: SearchFacetId[],
  explicitTreat: TreatPreference | null,
): SearchFacetId[] {
  const active = new Set<SearchFacetId>();

  for (const f of signaled) {
    if (!TREAT_MUTEX.includes(f)) active.add(f);
  }

  if (treatFacets.length > 0) {
    for (const f of treatFacets) active.add(f);
    if (explicitTreat) {
      for (const mutex of TREAT_MUTEX) {
        if (!treatFacets.includes(mutex)) active.delete(mutex);
      }
    }
  }

  return [...active];
}

function mealPeriodFromQuery(query: string): SearchFacetConstraints["mealPeriod"] {
  const m = query.match(MEAL_PATTERN);
  if (!m) return null;
  const token = m[1]!.toLowerCase().replace(/\s+/g, "_");
  if (token === "supper" || token === "evening_meal") return "dinner";
  if (token === "morning_meal") return "breakfast";
  if (
    token === "breakfast" ||
    token === "brunch" ||
    token === "lunch" ||
    token === "dinner" ||
    token === "late_night"
  ) {
    return token;
  }
  return null;
}

function dietaryFromQuery(query: string): string[] {
  const out = new Set<string>();
  for (const m of query.matchAll(DIETARY_PATTERN)) {
    const raw = m[0]!.toLowerCase().replace(/[- ]+/g, "_");
    if (raw.includes("gluten")) out.add("gluten_free");
    else if (raw === "vegan") out.add("vegan");
    else if (raw === "vegetarian") out.add("vegetarian");
    else if (raw.includes("dairy")) out.add("dairy_free");
    else if (raw.includes("nut")) out.add("nut_free");
    else out.add(raw);
  }
  return [...out];
}

function resolveFacetConstraints(input: {
  effectiveQuery: string;
  townOrArea?: string | null;
  sessionTown?: string | null;
  vibeTags?: string[];
  dietaryTags?: string[];
  priceLevel?: number | null;
  occasion?: string | null;
  themes: AskQueryThemes;
  ambient?: AmbientContext;
}): SearchFacetConstraints {
  const vibeSet = new Set(input.vibeTags ?? []);
  if (input.themes.kids) vibeSet.add("kid_friendly");

  const dietarySet = new Set(dietaryFromQuery(input.effectiveQuery));
  for (const d of input.dietaryTags ?? []) {
    dietarySet.add(d.toLowerCase().replace(/\s+/g, "_"));
  }

  let townOrArea: string | null = null;
  let locationRadius: SearchFacetConstraints["locationRadius"] = "anywhere";

  const clarifyTown = input.townOrArea?.trim();
  if (clarifyTown && !isCorridorPlaceholder(clarifyTown)) {
    townOrArea = clarifyTown;
    locationRadius = "near";
  } else {
    const sessionTown = input.sessionTown?.trim();
    if (sessionTown && !isCorridorPlaceholder(sessionTown)) {
      townOrArea = sessionTown;
      locationRadius = "near";
    } else {
      const fromQuery = extractTownFromNormalizedQuery(input.effectiveQuery.toLowerCase());
      if (fromQuery) {
        townOrArea = fromQuery;
        locationRadius = "near";
      }
    }
  }

  let mealPeriod = mealPeriodFromQuery(input.effectiveQuery);
  if (
    !mealPeriod &&
    input.ambient &&
    isVagueFoodQuery(input.effectiveQuery) &&
    !hasExplicitMealPeriod(input.effectiveQuery)
  ) {
    mealPeriod = input.ambient.searchSignals.impliedMealPeriod ?? null;
  }

  return {
    townOrArea,
    locationRadius,
    mealPeriod,
    dietaryNeeds: [...dietarySet],
    vibeTags: [...vibeSet],
    occasion: input.occasion?.trim() || null,
    priceLevel: input.priceLevel ?? null,
  };
}

function isFacetPlanComplete(
  active: SearchFacetId[],
  input: {
    normalized: string;
    toolCategorySlug: string | null;
    vibeOnly: boolean;
  },
): boolean {
  const wc = input.normalized.trim().split(/\s+/).filter(Boolean).length;
  if (wc > FACET_PLAN_MAX_WORDS) return false;

  if (
    VAGUE_OPEN_ENDED.test(input.normalized) &&
    active.length === 0 &&
    !input.toolCategorySlug
  ) {
    return false;
  }

  if (input.vibeOnly && active.length === 0) return false;

  return active.length > 0 || Boolean(input.toolCategorySlug);
}

/** Highest-priority facet when several passes run in parallel (e.g. coffee + bakery). */
export function primaryFacetFromActive(active: SearchFacetId[]): SearchFacetId | null {
  if (!active.length) return null;
  let best: SearchFacetId = active[0]!;
  let bestW = FACET_PRIORITY[best] ?? 0;
  for (const f of active) {
    const w = FACET_PRIORITY[f] ?? 0;
    if (w > bestW) {
      best = f;
      bestW = w;
    }
  }
  return best;
}

function toolCategoryToFacet(slug: string): SearchFacetId | null {
  const map: Record<string, SearchFacetId> = {
    coffee_shops: "coffee",
    restaurants: "dining",
    bars: "bars",
    shopping: "shopping",
    activities: "activities",
    services: "services",
  };
  return map[slug] ?? null;
}

export function resolveSearchFacets(input: {
  effectiveQuery: string;
  themes: AskQueryThemes;
  toolCategorySlug?: string | null;
  intent?: SearchIntent;
  townOrArea?: string | null;
  sessionTown?: string | null;
  vibeTags?: string[];
  dietaryTags?: string[];
  priceLevel?: number | null;
  occasion?: string | null;
  ambient?: AmbientContext;
}): ResolvedSearchFacets {
  const explicitTreat = detectTreatPreference(input.effectiveQuery);
  const signaled = signaledFacetsFromThemes(input.themes);
  const signaledSet = new Set(signaled);

  const toolCat = input.toolCategorySlug ?? null;
  if (toolCat === "coffee_shops") signaledSet.add("coffee");
  if (toolCat === "restaurants") signaledSet.add("dining");
  if (toolCat === "bars") signaledSet.add("bars");
  if (toolCat === "shopping") signaledSet.add("shopping");
  if (toolCat === "activities") signaledSet.add("activities");

  const mealFromQuery = mealPeriodFromQuery(input.effectiveQuery);
  if (mealFromQuery && !signaledSet.has("dining") && !toolCat) {
    signaledSet.add("dining");
  }
  if (isVagueFoodQuery(input.effectiveQuery) && !toolCat) {
    signaledSet.add("dining");
  }

  const service = resolveServiceFacet(input.effectiveQuery, toolCat);
  if (service) signaledSet.add(service);

  const treatFacets = resolveTreatFacets(input.themes, explicitTreat);
  for (const f of TREAT_MUTEX) signaledSet.delete(f);

  let active = applyMutexGroups(signaledSet, treatFacets, explicitTreat);

  if (active.length === 0) {
    if (toolCat) {
      const mapped = toolCategoryToFacet(toolCat);
      if (mapped) active = [mapped];
    }
  }

  const constraints = resolveFacetConstraints({
    effectiveQuery: input.effectiveQuery,
    townOrArea: input.townOrArea,
    sessionTown: input.sessionTown,
    vibeTags: input.vibeTags,
    dietaryTags: input.dietaryTags,
    priceLevel: input.priceLevel,
    occasion: input.occasion,
    themes: input.themes,
    ambient: input.ambient,
  });

  const vibeOnly =
    constraints.vibeTags.length > 0 &&
    active.length === 0 &&
    !toolCat &&
    !constraints.mealPeriod;

  const normalized = input.effectiveQuery.toLowerCase();
  const planComplete = isFacetPlanComplete(active, {
    normalized,
    toolCategorySlug: toolCat,
    vibeOnly,
  });

  return {
    active,
    explicitTreat,
    signaled,
    constraints,
    planComplete,
  };
}
