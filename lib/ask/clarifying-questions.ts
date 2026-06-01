/**
 * Context-aware clarifying question generator for Ask searches.
 *
 * DESIGN PRINCIPLE: Every question must map directly to a search parameter
 * don't ask it.
 *
 * Good questions (change the search):
 *   "What kind of treat?" → donut/ice cream/bakery each fires a different strategy
 *   "Any dietary restrictions?" → dietary_tags: ["gluten_free"]
 *   "Near which town?" → town_or_area constraint
 *   "Adults or kids?" → kid_friendly tag
 *   "Casual or upscale?" → vibe tags: ["casual"] vs ["upscale"]
 *
 * Bad questions (don't change the search):
 *   "Special occasion?" → "birthday" tells us nothing actionable
 *   "Budget?" → "mid-range" doesn't map cleanly to price_level
 *   "Group size?" → we can't filter by headcount
 *   "When are you going?" → we don't have live hours
 */

import type { ClarificationFormArtifact } from "@/lib/ask/types";
import type { SessionSearchHints } from "@/lib/ask/session-context";
import { hasExplicitMealPeriod } from "@/lib/ask/ambient-search";

export type ClarifyingQuestion = {
  id: string;
  question: string;
  /** Shown as tap-to-select chips. If absent, renders a text input. */
  suggestions?: string[];
  /** Show chips AND a free-text input below (e.g. for location). */
  allowFreeText?: boolean;
  /** Which search param each answer maps to (for LLM and compile step). */
  paramHint?: string;
};

export type CapabilityMismatch = {
  capability: string;
  disclosure: string;
  offerSearch: boolean;
};

// ---------------------------------------------------------------------------
// Category detection
// ---------------------------------------------------------------------------

const CATEGORY_PATTERNS = {
  restaurants: /\b(eat|food|restaurant|dining|dinner|lunch|breakfast|brunch|meal|hungry|bite|place\s+to\s+eat|somewhere\s+to\s+eat|seafood|pizza|burger|tacos|sushi|bbq|steak|pasta|sandwiches?)\b/i,
  coffee_shops: /\b(coffee|cafe|espresso|latte|cappuccino|cortado|cold\s+brew|pour\s+over)\b/i,
  bars:         /\b(bar|bars|cocktail|cocktails|drinks|beer|wine|brewery|happy\s+hour|nightlife|pub|taproom)\b/i,
  activities:   /\b(kayak|paddleboard|surf|bike|bikes?|rental|golf|yoga|tour|boat|fishing|tennis|pickleball|snorkel|charter|class|lesson|workout)\b/i,
  shopping:     /\b(shop|shopping|boutique|store|buy|gift|souvenir|clothes|clothing|jewelry|apparel)\b/i,
  services:     /\b(photographer|photography|chef|catering|spa|massage|salon|hair|nails|wedding|planner|therapist)\b/i,
  desserts:     /\b(ice cream|gelato|frozen\s+yogurt|froyo|donut|doughnut|bakery|pastry|cookie|cupcake|brownie|sundae|soft\s+serve)\b/i,
} as const;

type CategorySlug = keyof typeof CATEGORY_PATTERNS;

function detectCategory(message: string): CategorySlug | null {
  for (const [cat, pattern] of Object.entries(CATEGORY_PATTERNS) as [CategorySlug, RegExp][]) {
    if (pattern.test(message)) return cat;
  }
  return null;
}

function isCategoryAmbiguous(message: string): boolean {
  const AMBIGUOUS = /\b(something to do|what to do|where (should|can) (we|i)|looking for\s+something|anything fun|cool place|good place|somewhere (nice|fun|good)|what'?s? (good|fun|open)|recommendations?|places? to (check out|visit|go)|what do you (suggest|recommend)|help me find|find me)\b/i;
  return !detectCategory(message) && AMBIGUOUS.test(message);
}

// ---------------------------------------------------------------------------
// Context signals
// ---------------------------------------------------------------------------

type QueryContext = {
  category: CategorySlug | null;
  categoryAmbiguous: boolean;
  hasLocation: boolean;
  hasDietary: boolean;
  hasGroup: boolean;
  hasMealPeriod: boolean;
  hasVibe: boolean;
  /** Query mentions a treat/dessert but it's unclear what kind */
  hasTreatAmbiguity: boolean;
  /** Query mentions food but not what type */
  hasFoodTypeAmbiguity: boolean;
  /** Query mentions activities but unclear water vs land */
  hasActivityAmbiguity: boolean;
};

const TOWN_NAMES =
  /\b(seaside|rosemary\s*beach|alys\s*beach|watercolor|watersound|seagrove|grayton|santa\s*rosa|inlet\s*beach|blue\s*mountain|dune\s*allen|gulf\s*place)\b/i;

function analyzeQuery(message: string): QueryContext {
  const m = message.toLowerCase();

  // "treat" or "something sweet" but no specific item mentioned
  const hasTreatAmbiguity =
    /\b(treat|treats|something sweet|dessert|sweets?)\b/i.test(m) &&
    !/\b(donut|doughnut|ice cream|gelato|bakery|pastry|cookie|cake|chocolate|muffin|croissant)\b/i.test(m);

  // "restaurant" or "food" or "eat" but no cuisine or dish type
  const hasFoodTypeAmbiguity =
    /\b(restaurant|eat|food|hungry|meal|bite|dine|dining)\b/i.test(m) &&
    !/\b(seafood|pizza|burger|tacos|sushi|bbq|steak|pasta|sandwich|breakfast|brunch|lunch|dinner|coffee|bar|pub)\b/i.test(m);

  // "activities" or "things to do" but no specific activity
  const hasActivityAmbiguity =
    /\b(activit|things?\s+to\s+do|something\s+to\s+do|fun)\b/i.test(m) &&
    !/\b(kayak|surf|bike|golf|yoga|fishing|boat|tennis|pickleball)\b/i.test(m);

  return {
    category:             detectCategory(m),
    categoryAmbiguous:    isCategoryAmbiguous(m),
    hasLocation:          TOWN_NAMES.test(m) || /\b(near|close to|around|in\s+\w|at\s+\w)\b/.test(m),
    hasDietary:           /\b(gluten|vegan|vegetarian|dairy|allerg|nut.free|keto|halal|kosher)\b/i.test(m),
    hasGroup:             /\b(kids?|children|family|families|adults?\s+only|date|couple|group|solo|just\s+me|we\b|us\b)\b/i.test(m),
    hasMealPeriod:        /\b(breakfast|brunch|lunch|dinner|late\s+night|morning|evening)\b/i.test(m),
    hasVibe:              /\b(casual|upscale|fancy|romantic|lively|quiet|outdoor|waterfront|hidden|chill|low.key)\b/i.test(m),
    hasTreatAmbiguity,
    hasFoodTypeAmbiguity,
    hasActivityAmbiguity,
  };
}

// ---------------------------------------------------------------------------
// Capability mismatch detection (early exit)
// ---------------------------------------------------------------------------

type CapabilityType = "reservations" | "live_hours" | "ordering" | "phone_call" | "wait_times";

const CAPABILITY_PATTERNS: [CapabilityType, RegExp][] = [
  ["reservations",  /\b(reservations?|book\s+a\s+table|make\s+a\s+booking|reserve)\b/i],
  ["live_hours",    /\b(open\s+now|what\s+time|hours|is\s+it\s+open|closing\s+time|opening\s+time)\b/i],
  ["ordering",      /\b(order\s+(food|delivery|takeout|take.?out)|delivery\s+from|doordash|uber\s+eats|grubhub)\b/i],
  ["phone_call",    /\b(call\s+them|give\s+(me|us)\s+the\s+number|phone\s+number|contact\s+them)\b/i],
  ["wait_times",    /\b(wait\s+time|how\s+long\s+(is\s+the\s+)?wait|queue|line\s+up)\b/i],
];

const CAPABILITY_DISCLOSURES: Record<CapabilityType, CapabilityMismatch> = {
  reservations: {
    capability: "reservations",
    disclosure: "I can't make reservations — I can find you the best options with contact info so you can call or book through their website.",
    offerSearch: true,
  },
  live_hours: {
    capability: "live hours",
    disclosure: "I don't have live hours — I can still find the right places; check Google Maps or call ahead to confirm they're open.",
    offerSearch: true,
  },
  ordering: {
    capability: "food ordering",
    disclosure: "I can't place orders or connect to delivery apps. I can find great spots and you'd order directly or through a delivery service.",
    offerSearch: true,
  },
  phone_call: {
    capability: "direct contact",
    disclosure: "I can't make calls, but my listings include phone numbers and websites so you can reach out directly.",
    offerSearch: true,
  },
  wait_times: {
    capability: "live wait times",
    disclosure: "I don't have live wait times. I can find the right places and you'd call ahead or check Yelp/Google.",
    offerSearch: true,
  },
};

export function detectCapabilityMismatch(message: string): CapabilityMismatch | null {
  for (const [type, pattern] of CAPABILITY_PATTERNS) {
    if (pattern.test(message)) return CAPABILITY_DISCLOSURES[type];
  }
  return null;
}

// ---------------------------------------------------------------------------
// Question bank — each question maps directly to a search parameter
// ---------------------------------------------------------------------------

// Treat type: maps to specificItems + strategy selection
const Q_TREAT_TYPE: ClarifyingQuestion = {
  id: "treat_type",
  question: "What kind of treat are you in the mood for?",
  suggestions: ["Donut / pastry", "Ice cream / gelato", "Bakery item", "Coffee & something sweet"],
  paramHint: "specificItems",
};

// Food type: maps to query enrichment
const Q_FOOD_TYPE: ClarifyingQuestion = {
  id: "food_type",
  question: "Any particular type of food, or wide open?",
  suggestions: ["Seafood", "American / casual", "Mexican / tacos", "Something with a view", "Surprise me"],
  paramHint: "query",
};

// Location: maps to town_or_area
const Q_LOCATION: ClarifyingQuestion = {
  id: "location",
  question: "Where on 30A?",
  suggestions: ["Seaside / WaterColor", "Rosemary Beach", "Grayton / Santa Rosa", "Alys Beach", "Anywhere"],
  allowFreeText: true,
  paramHint: "town_or_area",
};

// Group: maps to kid_friendly tag
const Q_GROUP: ClarifyingQuestion = {
  id: "group",
  question: "Adults only, or are kids coming?",
  suggestions: ["Adults only", "Family with kids", "Date night for two", "Mixed group"],
  paramHint: "tags.kid_friendly",
};

// Dietary: maps to dietary_tags
const Q_DIETARY: ClarifyingQuestion = {
  id: "dietary",
  question: "Any dietary restrictions to keep in mind?",
  suggestions: ["Gluten-free", "Vegan / vegetarian", "Dairy-free", "None"],
  paramHint: "dietary_tags",
};

// Meal period: maps to query + meal period filter
const Q_MEAL_PERIOD: ClarifyingQuestion = {
  id: "meal_period",
  question: "Which meal?",
  suggestions: ["Breakfast / brunch", "Lunch", "Dinner", "Late night / drinks"],
  paramHint: "query",
};

// Vibe: maps to vibe tags — only casual vs upscale (actionable distinction)
const Q_VIBE: ClarifyingQuestion = {
  id: "vibe",
  question: "Casual or upscale?",
  suggestions: ["Casual / laid-back", "Upscale / special occasion", "Either works"],
  paramHint: "tags.casual_or_upscale",
};

// Waterfront: maps to atmosphere tag
const Q_WATERFRONT: ClarifyingQuestion = {
  id: "waterfront",
  question: "Waterfront view or doesn't matter?",
  suggestions: ["Waterfront preferred", "Doesn't matter"],
  paramHint: "tags.waterfront",
};

// Coffee vibe: maps to search query enrichment
const Q_COFFEE_VIBE: ClarifyingQuestion = {
  id: "coffee_vibe",
  question: "What kind of spot?",
  suggestions: ["Quiet place to work / read", "Cozy social café", "Quick grab-and-go", "Outdoor / open air"],
  paramHint: "query",
};

// Activity type: maps to query + category
const Q_ACTIVITY_TYPE: ClarifyingQuestion = {
  id: "activity_type",
  question: "On the water or on land?",
  suggestions: ["On the water (kayak, paddleboard, surf)", "On land (bike, golf, yoga)", "Either"],
  paramHint: "query",
};

// Activity group: maps to kid_friendly + requiredIsService
const Q_ACTIVITY_GROUP: ClarifyingQuestion = {
  id: "activity_group",
  question: "Who's joining you?",
  suggestions: ["Just me", "Couple", "Family with kids", "Group of friends"],
  paramHint: "tags",
};

// Shopping type: maps to query
const Q_SHOPPING_TYPE: ClarifyingQuestion = {
  id: "shopping_type",
  question: "What are you looking for?",
  suggestions: ["Clothing / resort wear", "Gifts / souvenirs", "Art / gallery", "Home goods", "Just browsing"],
  paramHint: "query",
};

// Service type: maps to query
const Q_SERVICE_WHEN: ClarifyingQuestion = {
  id: "service_when",
  question: "For a specific date or just exploring options?",
  suggestions: ["Specific upcoming date", "Just exploring", "As soon as possible"],
  paramHint: "query",
};

// ---------------------------------------------------------------------------
// Main generator — returns only questions that change the search
// ---------------------------------------------------------------------------

/**
 * Returns 1–4 clarifying questions for a new search.
 * Every question maps to a search parameter that improves results.
 * Skips questions whose answers we already know or can't use.
 */
export function buildClarifyingQuestions(
  message: string,
  isNewSearch: boolean,
  ambient?: import("@/lib/ask/ambient-context").AmbientContext,
  session?: SessionSearchHints,
): ClarifyingQuestion[] {
  if (!isNewSearch) return [];

  const ctx = analyzeQuery(message);
  const questions: ClarifyingQuestion[] = [];

  const push = (q: ClarifyingQuestion) => {
    if (questions.length < 4 && !questions.some((x) => x.id === q.id)) {
      questions.push(q);
    }
  };

  const hasKnownLocation =
    ctx.hasLocation || Boolean(session?.knownTown) || Boolean(session?.isNearbyFollowUp);
  const hasKnownDietary = ctx.hasDietary || (session?.knownDietaryTags?.length ?? 0) > 0;
  const hasKnownVibe = ctx.hasVibe || (session?.knownVibeTags?.length ?? 0) > 0;
  const hasMealFromTime =
    ctx.hasMealPeriod ||
    hasExplicitMealPeriod(message) ||
    Boolean(ambient?.searchSignals.impliedMealPeriod) ||
    Boolean(ambient?.searchSignals.suggestLightBite);

  // Skip clarification when:
  // 1. Clear category + clear location — Wave 0 handles it well
  // 2. 3+ signals already present (including session memory)
  const hasCategoryAndLocation = ctx.category !== null && hasKnownLocation;
  if (hasCategoryAndLocation) return [];

  const signalCount = [
    ctx.category !== null,
    hasKnownLocation,
    hasKnownDietary,
    ctx.hasGroup,
    hasMealFromTime,
    hasKnownVibe,
  ].filter(Boolean).length;
  if (signalCount >= 3) return [];

  // ── Ambiguous category: ask first, stop early ──
  if (ctx.categoryAmbiguous) {
    push({
      id: "category",
      question: "What kind of place are you looking for?",
      suggestions: ["Restaurant / food", "Coffee or café", "Bars & drinks", "Activities / things to do", "Shopping", "Services (spa, photographer…)"],
      paramHint: "category",
    });
    if (!hasKnownLocation) push(Q_LOCATION);
    return questions.slice(0, 2);
  }

  // ── Treat ambiguity: this is the #1 case where NL disambiguation matters ──
  // "I want a treat" could be donuts, ice cream, or bakery — each needs a different strategy.
  // If it's hot outside, lead with cold treat options.
  if (ctx.hasTreatAmbiguity) {
    const treatQ = ambient?.searchSignals.preferCold
      ? {
          ...Q_TREAT_TYPE,
          question: "What kind of treat? (It's hot out — cold options are great right now!)",
          suggestions: ["Ice cream / gelato", "Cold brew & something sweet", "Donut / pastry", "Bakery item"],
        }
      : Q_TREAT_TYPE;
    push(treatQ);
    if (!hasKnownLocation) push(Q_LOCATION);
    return questions.slice(0, 2);
  }

  const cat = ctx.category;
  const preferIndoor = ambient?.searchSignals.preferIndoor ?? false;
  const preferCold = ambient?.searchSignals.preferCold ?? false;
  const avoidCrowded = ambient?.searchSignals.avoidCrowded ?? false;
  const stormWindow = ambient?.searchSignals.stormWindow ?? false;

  // ── Ambient-aware override questions (inject before category-specific ones) ──

  // Afternoon storm + vague food: skip "which meal?" — time context handles it
  if (stormWindow && cat === "restaurants" && !hasMealFromTime && !ctx.hasFoodTypeAmbiguity) {
    push({
      id: "storm_wait",
      question: "Afternoon storms are common right now — wait it out indoors or still planning dinner later?",
      suggestions: ["Indoor café / light bite now", "Covered patio", "Planning dinner for later"],
      paramHint: "query",
    });
  }

  // Rainy / stormy: ask about indoor preference if it's not already clear
  // Only for ambiguous categories or activities (where indoor vs outdoor really matters)
  if (preferIndoor && !ctx.hasVibe && (cat === "activities" || !cat)) {
    push({
      id: "indoor_weather",
      question: "It's raining out — indoor or still open to outdoor options?",
      suggestions: ["Indoor only please", "Either works", "We don't mind the rain"],
      paramHint: "tags",
    });
  }

  // Very busy season: offer hidden-gem vs popular
  if (avoidCrowded && !ctx.hasVibe && cat === "restaurants") {
    push({
      id: "crowd_pref",
      question: "30A is packed right now — hidden gem or iconic popular spot?",
      suggestions: ["Hidden gem / local favorite", "Popular is fine, we'll wait", "Off the beaten path"],
      paramHint: "tags.local_favorite",
    });
  }

  // ── Coffee ──
  if (cat === "coffee_shops") {
    if (!hasKnownLocation) push(Q_LOCATION);
    if (!hasKnownVibe) push(Q_COFFEE_VIBE);
  }

  // ── Bars ──
  else if (cat === "bars") {
    if (!hasKnownLocation) push(Q_LOCATION);
    if (!ctx.hasGroup) push(Q_GROUP);
    if (!hasKnownVibe) push(Q_VIBE);
  }

  // ── Restaurants: ask what's useful, skip what's not ──
  else if (cat === "restaurants") {
    if (!hasKnownLocation) push(Q_LOCATION);
    if (ctx.hasFoodTypeAmbiguity) push(Q_FOOD_TYPE);
    if (!hasMealFromTime) push(Q_MEAL_PERIOD);
    if (!ctx.hasGroup) push(Q_GROUP);
    if (!hasKnownDietary) push(Q_DIETARY);
    if (!hasKnownVibe && questions.length < 3) push(Q_VIBE);
  }

  // ── Activities ──
  else if (cat === "activities") {
    if (ctx.hasActivityAmbiguity) push(Q_ACTIVITY_TYPE);
    if (!ctx.hasGroup) push(Q_ACTIVITY_GROUP);
    if (!hasKnownLocation) push(Q_LOCATION);
  }

  // ── Desserts / sweet treats ──
  else if (cat === "desserts") {
    if (!hasKnownLocation) push(Q_LOCATION);
    // No Q_GROUP — dessert spots are universally family-friendly
  }

  // ── Shopping ──
  else if (cat === "shopping") {
    push(Q_SHOPPING_TYPE);
    if (!hasKnownLocation) push(Q_LOCATION);
  }

  // ── Services ──
  else if (cat === "services") {
    push(Q_SERVICE_WHEN);
    if (!ctx.hasGroup) push(Q_ACTIVITY_GROUP);
  }

  // ── No clear category detected ──
  else {
    if (!hasKnownLocation) push(Q_LOCATION);
    // Q_GROUP omitted — without a category context, adults vs kids doesn't change results
  }

  return questions.slice(0, 4);
}

// ---------------------------------------------------------------------------
// Format for LLM context (used when form isn't available)
// ---------------------------------------------------------------------------

export function isClarificationFollowUp(
  artifact: ClarificationFormArtifact | { type: string } | undefined,
): artifact is ClarificationFormArtifact {
  return artifact?.type === "clarification_form";
}

/** Merge the original ask with chip-form answers for search. */
export function composeClarificationSearchQuery(originalQuery: string, answers: string): string {
  const original = originalQuery.trim();
  const detail = answers.trim();
  if (!original) return detail;
  if (!detail) return original;
  return `${original}. ${detail}`;
}

export function formatClarifyingQuestionsForPrompt(questions: ClarifyingQuestion[]): string {
  if (!questions.length) return "";
  return questions
    .map((q, i) => {
      const hints = q.suggestions?.length
        ? ` (e.g. ${q.suggestions.slice(0, 3).join(" / ")})`
        : "";
      return `${i + 1}. ${q.question}${hints}`;
    })
    .join("\n");
}
