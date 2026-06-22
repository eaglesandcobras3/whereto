/**
 * Clarifying question generator for Ask searches.
 *
 * DESIGN: The question bank (text, chips, param hints) is curated here.
 * The DECISION of which questions to ask is delegated to the LLM — it
 * understands natural language far better than regex can. This eliminates
 * the need for per-category pattern maintenance.
 *
 * Good questions (change the search):
 *   "What kind of treat?" → donut/ice cream/bakery each fires a different strategy
 *   "Any dietary restrictions?" → dietary_tags: ["gluten_free"]
 *   "Where on 30A?" → town_or_area constraint
 *   "Casual or upscale?" → vibe tags: ["casual"] vs ["upscale"]
 *
 * The LLM decides: group/party questions are omitted for food/dessert, location
 * is skipped when mentioned, dietary is skipped when stated in the query, etc.
 */

import "server-only";

import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { SessionSearchHints } from "@/lib/ask/session-context";
import type { AmbientContext } from "@/lib/ask/ambient-context";
import { detectQueryThemes } from "@/lib/ask/search-input";

export { composeClarificationSearchQuery, isClarificationFollowUp } from "@/lib/ask/clarifying-query";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
// Question bank — curated text, chips, and param hints
// The LLM picks from these IDs; it does not generate question text.
// ---------------------------------------------------------------------------

/** Max clarifying questions shown at once (location may use one slot). */
export const MAX_CLARIFY_QUESTIONS = 5;

const QUESTION_IDS = [
  "category",
  "location",
  "dietary",
  "treat_type",
  "food_type",
  "meal_period",
  "vibe",
  "activity_type",
  "shopping_type",
] as const;

type QuestionId = (typeof QUESTION_IDS)[number];

const QUESTION_BANK: Record<QuestionId, ClarifyingQuestion> = {
  category: {
    id: "category",
    question: "What kind of place are you looking for?",
    suggestions: [
      "Restaurant / food",
      "Coffee or café",
      "Bars & drinks",
      "Activities / things to do",
      "Shopping",
      "Services (spa, photographer…)",
    ],
    paramHint: "category",
  },
  location: {
    id: "location",
    question: "Where on 30A?",
    suggestions: [
      "Rosemary Beach",
      "Alys Beach",
      "Inlet Beach",
      "WaterSound",
      "Seaside",
      "WaterColor",
      "Seagrove Beach",
      "Grayton Beach",
      "Santa Rosa Beach",
      "Blue Mountain Beach",
      "Gulf Place",
      "Dune Allen Beach",
      "Anywhere on 30A",
    ],
    allowFreeText: true,
    paramHint: "town_or_area",
  },
  dietary: {
    id: "dietary",
    question: "Any dietary restrictions?",
    suggestions: [
      "No restrictions",
      "Gluten-free",
      "Vegan / plant-based",
      "Vegetarian",
      "Dairy-free",
    ],
    paramHint: "dietary_tags",
  },
  treat_type: {
    id: "treat_type",
    question: "What kind of treat are you in the mood for?",
    suggestions: ["Donut / pastry", "Ice cream / gelato", "Bakery item", "Coffee & something sweet"],
    paramHint: "specificItems",
  },
  food_type: {
    id: "food_type",
    question: "Any particular type of food, or wide open?",
    suggestions: ["Seafood", "American / casual", "Mexican / tacos", "Something with a view", "Surprise me"],
    paramHint: "query",
  },
  meal_period: {
    id: "meal_period",
    question: "Which meal?",
    suggestions: ["Breakfast / brunch", "Lunch", "Dinner", "Late night / drinks"],
    paramHint: "query",
  },
  vibe: {
    id: "vibe",
    question: "Casual or upscale?",
    suggestions: ["Casual / laid-back", "Upscale / special occasion", "Either works"],
    paramHint: "tags.casual_or_upscale",
  },
  activity_type: {
    id: "activity_type",
    question: "On the water or on land?",
    suggestions: [
      "On the water (kayak, paddleboard, surf)",
      "On land (bike, golf, yoga)",
      "Either",
    ],
    paramHint: "query",
  },
  shopping_type: {
    id: "shopping_type",
    question: "What are you looking for?",
    suggestions: ["Clothing / resort wear", "Gifts / souvenirs", "Art / gallery", "Home goods", "Just browsing"],
    paramHint: "query",
  },
};

// ---------------------------------------------------------------------------
// Capability mismatch detection (unchanged — regexes are correct here)
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
    disclosure: "I can't make reservations. I can find you the best options with contact info so you can call or book through their website.",
    offerSearch: true,
  },
  live_hours: {
    capability: "live hours",
    disclosure: "I don't have live hours. I can still find the right places; check Google Maps or call ahead to confirm they're open.",
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
// LLM-based question decision
// ---------------------------------------------------------------------------

const decidedQuestionsSchema = z.object({
  questions: z
    .array(z.enum(QUESTION_IDS))
    .max(MAX_CLARIFY_QUESTIONS)
    .describe(
      "IDs of clarifying questions to ask, in priority order. Empty array if the search can proceed without clarification.",
    ),
});

const decidedQuestionsWithReasoningSchema = z.object({
  questions: z
    .array(z.enum(QUESTION_IDS))
    .max(MAX_CLARIFY_QUESTIONS)
    .describe("IDs of clarifying questions to ask, in priority order. Empty array if sufficient context exists."),
  reasoning: z
    .string()
    .describe(
      "2-3 sentences explaining why you chose these questions (or why none are needed). Reference the specific signals in the query and explain what information would meaningfully change the search results.",
    ),
  questionReasons: z
    .array(
      z.object({
        id: z.enum(QUESTION_IDS),
        reason: z.string().describe("One sentence: why this specific question matters for this query."),
      }),
    )
    .describe("Per-question reasoning for each chosen question."),
});

const TOWN_NAMES_REGEX =
  /\b(seaside|rosemary\s*beach|alys\s*beach|watercolor|water\s*color|watersound|water\s*sound|seagrove|grayton|santa\s*rosa|inlet\s*beach|blue\s*mountain|dune\s*allen|gulf\s*place|prominence|30a)\b/i;

async function decideClarifyingQuestionIds(
  message: string,
  ambient: AmbientContext | undefined,
  session: SessionSearchHints | undefined,
): Promise<QuestionId[]> {
  const known: string[] = [];
  if (session?.knownTown) known.push(`Location already known: ${session.knownTown}`);
  if (session?.knownDietaryTags?.length) known.push(`Dietary already known: ${session.knownDietaryTags.join(", ")}`);
  if (session?.knownVibeTags?.length) known.push(`Vibe already known: ${session.knownVibeTags.join(", ")}`);
  if (session?.isNearbyFollowUp) known.push("User is asking for more options nearby (location implicitly known)");
  if (ambient?.searchSignals.impliedMealPeriod) known.push(`Time of day implies: ${ambient.searchSignals.impliedMealPeriod}`);
  if (ambient?.searchSignals.preferCold) known.push("Currently hot outside (>85°F) — cold treats are especially relevant");
  if (ambient?.searchSignals.stormWindow) known.push("Afternoon storm window — indoor options preferred");

  const knownContext = known.length
    ? `\nAlready known:\n${known.map((k) => `- ${k}`).join("\n")}`
    : "";

  const { object } = await generateObject({
    model: openai(process.env.OPENAI_MODEL ?? "gpt-4o-mini"),
    schema: decidedQuestionsSchema,
    experimental_telemetry: { isEnabled: true, functionId: "ask-clarify-decide" },
    prompt: `You decide which clarifying questions to ask before searching local businesses on Florida's 30A coast.

User query: "${message}"${knownContext}

Choose ONLY questions where knowing the answer would meaningfully change which places are recommended:
- category: "What kind of place?" — ONLY if query is completely ambiguous with zero category signal (e.g. "something fun" with no other hints)
- location: "Where on 30A?" — if no specific town or area is mentioned and not already known
- treat_type: "What kind of treat?" — if user wants sweets/dessert but the type is unclear (donut vs ice cream vs bakery each fire different strategies)
- food_type: "What type of food?" — if user wants to eat at a restaurant but no cuisine or dish type is given
- meal_period: "Which meal?" — ONLY for sit-down restaurant or dining bar queries where the meal time genuinely changes which places appear (breakfast cafes vs dinner restaurants are different businesses); NEVER for ice cream, coffee, treats, bakery, donuts, desserts, snacks, quick bites, activities, or shopping
- vibe: "Casual or upscale?" — for full-service restaurants or bars ONLY; NEVER for desserts, coffee, treats, activities, or shopping
- activity_type: "Water or land?" — if user wants activities but hasn't specified water vs. land
- shopping_type: "What are you looking for?" — for shopping queries without specifics

Rules:
- Return at most ${MAX_CLARIFY_QUESTIONS} questions, in priority order — only questions that would materially change results.
- NEVER ask meal_period for: ice cream, coffee, treats, donuts, pastries, desserts, bakery, snacks, activities, shopping, bars, or any non-restaurant category.
- NEVER ask about group size, party size, or adults-vs-kids.
- Skip any question whose answer is already clear from the query.
- Skip location if a town/area is mentioned or already known.
- Return an empty array if the query has enough context to run a good search.`,
  });

  return object.questions;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Hard rules — applied after LLM decision, cannot be overridden
// ---------------------------------------------------------------------------

/** Location is required when no town is in the query or session; everything else is LLM-chosen. */
function applyHardClarifyRules(
  message: string,
  llmIds: QuestionId[],
  session: SessionSearchHints | undefined,
): { questionIds: QuestionId[]; hardRuleIds: QuestionId[] } {
  const hardRuleIds: QuestionId[] = [];
  const knownLocation =
    TOWN_NAMES_REGEX.test(message) || session?.knownTown || session?.isNearbyFollowUp;
  if (!knownLocation) {
    hardRuleIds.push("location");
  }

  const result = [...hardRuleIds];
  for (const id of llmIds) {
    if (result.length >= MAX_CLARIFY_QUESTIONS) break;
    if (!result.includes(id)) result.push(id);
  }

  return { questionIds: result.slice(0, MAX_CLARIFY_QUESTIONS), hardRuleIds };
}

function isKnownLocation(message: string, session?: SessionSearchHints): boolean {
  return Boolean(
    TOWN_NAMES_REGEX.test(message) || session?.knownTown || session?.isNearbyFollowUp,
  );
}

/** Why each bank question was NOT asked — for inspect / debugging. */
export function explainSkippedClarifyingQuestions(
  message: string,
  selectedIds: QuestionId[],
  session?: SessionSearchHints,
): Array<{ id: QuestionId; question: string; reason: string }> {
  const themes = detectQueryThemes(message);
  const isFoodQuery =
    themes.dining || themes.treats || themes.bakery || themes.iceCream || themes.donuts;
  const isPureDrink = !isFoodQuery && (themes.coffee || themes.bars) && !themes.dining;
  const dietaryStated =
    /\b(vegan|vegetarian|gluten.?free|dairy.?free|nut.?free|halal|kosher|celiac|lactose)\b/i.test(
      message,
    );
  const hasCategorySignal =
    Object.values(themes).some(Boolean) ||
    /\b(restaurant|café|cafe|coffee|bar|shop|activity|spa|hotel)\b/i.test(message);

  const skipReasons: Record<QuestionId, string> = {
    category: hasCategorySignal
      ? "Query already signals a category (keywords or themes)."
      : "AI skipped — enough category signal to search, or other gaps ranked higher.",
    location: isKnownLocation(message, session)
      ? "Town or area already in query or session."
      : "Would be asked (required when location unknown).",
    dietary: !isFoodQuery
      ? "Not a food/treat query."
      : isPureDrink
        ? "Coffee/bar only — dietary rarely changes results."
        : dietaryStated
          ? "Dietary needs already stated in query."
          : "AI skipped — not needed to run a useful search right now.",
    treat_type: !(themes.treats || themes.bakery || themes.iceCream || themes.donuts)
      ? "Not a sweets/treat query."
      : "Treat type clear enough from query (donut vs ice cream vs bakery).",
    food_type: !themes.dining
      ? "Not a sit-down restaurant query."
      : "Cuisine or dish type already implied in the query.",
    meal_period: !themes.dining
      ? "Only for full restaurant meals — not this query type."
      : themes.coffee || themes.iceCream || themes.treats
        ? "Meal period irrelevant for coffee, treats, ice cream."
        : "Meal time clear from query or ambient context.",
    vibe: !themes.dining && !themes.bars
      ? "Vibe question only for restaurants/bars."
      : "Casual vs upscale already implied or not critical for this search.",
    activity_type: !themes.activities
      ? "Not an activities query."
      : "Water vs land already specified in the query.",
    shopping_type: !themes.shopping
      ? "Not a shopping query."
      : "Shopping type already specified in the query.",
  };

  return QUESTION_IDS.filter((id) => !selectedIds.includes(id)).map((id) => ({
    id,
    question: QUESTION_BANK[id].question,
    reason: skipReasons[id],
  }));
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Returns 0–5 clarifying questions for a new search.
 * Location is always asked when unknown; other slots are LLM-chosen from the curated bank.
 */
export async function buildClarifyingQuestions(
  message: string,
  isNewSearch: boolean,
  ambient?: AmbientContext,
  session?: SessionSearchHints,
): Promise<ClarifyingQuestion[]> {
  if (!isNewSearch) return [];

  let llmIds: QuestionId[];
  try {
    llmIds = await decideClarifyingQuestionIds(message, ambient, session);
  } catch {
    llmIds = [];
  }

  const { questionIds } = applyHardClarifyRules(message, llmIds, session);

  return questionIds.map((id) => {
    if (id === "treat_type" && ambient?.searchSignals.preferCold) {
      return {
        ...QUESTION_BANK.treat_type,
        question: "What kind of treat? (It's hot out, so cold options are great right now!)",
        suggestions: ["Ice cream / gelato", "Cold brew & something sweet", "Donut / pastry", "Bakery item"],
      };
    }
    return QUESTION_BANK[id];
  });
}

// ---------------------------------------------------------------------------
// Inspector variant — includes LLM reasoning (not used in production path)
// ---------------------------------------------------------------------------

export type ClarifyQuestionMeta = {
  id: string;
  source: "hard_rule" | "llm_selected";
};

export type ClarifyDecision = {
  questions: ClarifyingQuestion[];
  reasoning: string;
  questionReasons: Array<{ id: string; question: string; reason: string }>;
  skippedQuestions: Array<{ id: string; question: string; reason: string }>;
  questionMeta: ClarifyQuestionMeta[];
  llmRequestedIds: string[];
  hardRuleIds: string[];
  /** Curated chip text; AI only picks which IDs apply. */
  questionBankNote: string;
  wouldAsk: boolean;
};

export async function buildClarifyingQuestionsWithReasoning(
  message: string,
  ambient?: AmbientContext,
  session?: SessionSearchHints,
): Promise<ClarifyDecision> {
  const known: string[] = [];
  if (session?.knownTown) known.push(`Location already known: ${session.knownTown}`);
  if (session?.knownDietaryTags?.length) known.push(`Dietary already known: ${session.knownDietaryTags.join(", ")}`);
  if (session?.knownVibeTags?.length) known.push(`Vibe already known: ${session.knownVibeTags.join(", ")}`);
  if (session?.isNearbyFollowUp) known.push("User is asking for more options nearby (location implicitly known)");
  if (ambient?.searchSignals.impliedMealPeriod) known.push(`Time of day implies: ${ambient.searchSignals.impliedMealPeriod}`);
  if (ambient?.searchSignals.preferCold) known.push("Currently hot outside (>85°F) — cold treats are especially relevant");
  if (ambient?.searchSignals.stormWindow) known.push("Afternoon storm window — indoor options preferred");

  const knownContext = known.length
    ? `\nAlready known:\n${known.map((k) => `- ${k}`).join("\n")}`
    : "";

  let object: {
    questions: QuestionId[];
    reasoning: string;
    questionReasons: Array<{ id: QuestionId; reason: string }>;
  };

  try {
    const result = await generateObject({
      model: openai(process.env.OPENAI_MODEL ?? "gpt-4o-mini"),
      schema: decidedQuestionsWithReasoningSchema,
      experimental_telemetry: { isEnabled: true, functionId: "ask-clarify-inspect" },
      prompt: `You decide which clarifying questions to ask before searching local businesses on Florida's 30A coast.

User query: "${message}"${knownContext}

Choose ONLY questions where knowing the answer would meaningfully change which places are recommended:
- category: "What kind of place?" — ONLY if query is completely ambiguous with zero category signal (e.g. "something fun" with no other hints)
- location: "Where on 30A?" — if no specific town or area is mentioned and not already known
- treat_type: "What kind of treat?" — if user wants sweets/dessert but the type is unclear (donut vs ice cream vs bakery each fire different strategies)
- food_type: "What type of food?" — if user wants to eat at a restaurant but no cuisine or dish type is given
- meal_period: "Which meal?" — ONLY for sit-down restaurant or dining bar queries where the meal time genuinely changes which places appear (breakfast cafes vs dinner restaurants are different businesses); NEVER for ice cream, coffee, treats, bakery, donuts, desserts, snacks, quick bites, activities, or shopping
- vibe: "Casual or upscale?" — for full-service restaurants or bars ONLY; NEVER for desserts, coffee, treats, activities, or shopping
- activity_type: "Water or land?" — if user wants activities but hasn't specified water vs. land
- shopping_type: "What are you looking for?" — for shopping queries without specifics

Rules:
- Return at most ${MAX_CLARIFY_QUESTIONS} questions, in priority order — only if answers would change recommendations.
- NEVER ask meal_period for: ice cream, coffee, treats, donuts, pastries, desserts, bakery, snacks, activities, shopping, bars, or any non-restaurant category.
- NEVER ask about group size, party size, or adults-vs-kids.
- Skip any question whose answer is already clear from the query.
- Skip location if a town/area is mentioned or already known.
- Return an empty array if the query has enough context to run a good search.

Also provide reasoning explaining your decision (including why you skipped obvious candidates).`,
    });
    object = result.object;
  } catch {
    const knownLocation = isKnownLocation(message, session);
    const fallbackIds: QuestionId[] = knownLocation ? [] : ["location"];
    const hardRuleIds = knownLocation ? [] : ["location"];
    return {
      questions: fallbackIds.map((id) => QUESTION_BANK[id]),
      reasoning: "Fell back to default: asking location since no town was specified.",
      questionReasons: fallbackIds.map((id) => ({
        id,
        question: QUESTION_BANK[id].question,
        reason: "No town in query — search results depend heavily on area on 30A.",
      })),
      skippedQuestions: explainSkippedClarifyingQuestions(message, fallbackIds, session),
      questionMeta: fallbackIds.map((id) => ({ id, source: "hard_rule" as const })),
      llmRequestedIds: [],
      hardRuleIds,
      questionBankNote:
        "Question text comes from a curated bank; AI failed — only the location rule applied.",
      wouldAsk: fallbackIds.length > 0,
    };
  }

  const { questionIds: finalIds, hardRuleIds } = applyHardClarifyRules(message, object.questions, session);

  const questions = finalIds.map((id) => {
    if (id === "treat_type" && ambient?.searchSignals.preferCold) {
      return {
        ...QUESTION_BANK.treat_type,
        question: "What kind of treat? (It's hot out, so cold options are great right now!)",
        suggestions: ["Ice cream / gelato", "Cold brew & something sweet", "Donut / pastry", "Bakery item"],
      };
    }
    return QUESTION_BANK[id];
  });

  // Build per-question reasons, filling in defaults for hard-rule additions
  const hardRuleReasonMap: Partial<Record<QuestionId, string>> = {
    location:
      "No town was mentioned — knowing where on 30A you are changes which places appear (required).",
  };
  const llmReasonMap = Object.fromEntries(object.questionReasons.map((r) => [r.id, r.reason]));

  return {
    questions,
    reasoning: object.reasoning,
    questionReasons: finalIds.map((id) => ({
      id,
      question: QUESTION_BANK[id]?.question ?? id,
      reason: llmReasonMap[id] ?? hardRuleReasonMap[id] ?? "",
    })),
    skippedQuestions: explainSkippedClarifyingQuestions(message, finalIds, session),
    questionMeta: finalIds.map((id) => ({
      id,
      source: hardRuleIds.includes(id) ? ("hard_rule" as const) : ("llm_selected" as const),
    })),
    llmRequestedIds: object.questions,
    hardRuleIds,
    questionBankNote:
      "Question wording and chips are curated in code; the AI only selects which question IDs apply (up to 5) and explains why.",
    wouldAsk: questions.length > 0,
  };
}

// ---------------------------------------------------------------------------
// Helpers (unchanged)
// ---------------------------------------------------------------------------

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
