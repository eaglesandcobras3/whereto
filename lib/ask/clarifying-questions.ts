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
import type { ClarificationFormArtifact } from "@/lib/ask/types";
import type { SessionSearchHints } from "@/lib/ask/session-context";
import type { AmbientContext } from "@/lib/ask/ambient-context";

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

const QUESTION_IDS = [
  "category",
  "location",
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
      "Seaside / WaterColor",
      "Rosemary Beach",
      "Grayton / Santa Rosa",
      "Alys Beach",
      "Anywhere",
    ],
    allowFreeText: true,
    paramHint: "town_or_area",
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
// LLM-based question decision
// ---------------------------------------------------------------------------

const decidedQuestionsSchema = z.object({
  questions: z
    .array(z.enum(QUESTION_IDS))
    .max(2)
    .describe(
      "IDs of clarifying questions to ask, in priority order. Empty array if the search can proceed without clarification.",
    ),
});

const TOWN_NAMES_REGEX =
  /\b(seaside|rosemary\s*beach|alys\s*beach|watercolor|watersound|seagrove|grayton|santa\s*rosa|inlet\s*beach|blue\s*mountain|dune\s*allen|gulf\s*place)\b/i;

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
    prompt: `You decide which clarifying questions to ask before searching local businesses on Florida's 30A coast.

User query: "${message}"${knownContext}

Choose ONLY questions where knowing the answer would change which places are recommended:
- category: "What kind of place?" — ONLY if query is completely ambiguous with no category signal whatsoever
- location: "Where on 30A?" — if no specific town or area is mentioned and not already known
- treat_type: "What kind of treat?" — if user wants sweets/dessert but the type is unclear (donut vs ice cream vs bakery use different search strategies)
- food_type: "What type of food?" — if user wants to eat but no cuisine or dish type is given
- meal_period: "Which meal?" — if restaurant query without a clear meal or time signal
- vibe: "Casual or upscale?" — for restaurants or bars ONLY; never for desserts, coffee, or activities
- activity_type: "Water or land?" — if user wants activities but hasn't specified the type
- shopping_type: "What are you shopping for?" — for shopping queries without specifics

Rules:
- Return at most 2 questions, in priority order.
- NEVER ask about group size, party size, or adults-vs-kids for food, dessert, or coffee queries.
- Skip any question whose answer is already evident from the query (e.g. "gluten-free" → dietary known; "kayaking" → activity type known; "ice cream" → treat type is specific enough).
- Skip location if a town/area is clearly mentioned in the query or already known from context.
- Return an empty array if the query has enough to run a good search.`,
  });

  return object.questions;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Returns 0–2 clarifying questions for a new search.
 * The LLM decides which questions are useful; this function maps those
 * decisions to pre-curated question text and chips.
 *
 * Falls back to asking location-only if the LLM call fails.
 */
export async function buildClarifyingQuestions(
  message: string,
  isNewSearch: boolean,
  ambient?: AmbientContext,
  session?: SessionSearchHints,
): Promise<ClarifyingQuestion[]> {
  if (!isNewSearch) return [];

  let questionIds: QuestionId[];
  try {
    questionIds = await decideClarifyingQuestionIds(message, ambient, session);
  } catch {
    // Fallback: ask location only if no town is mentioned and not known from session.
    const knownLocation = TOWN_NAMES_REGEX.test(message) || session?.knownTown || session?.isNearbyFollowUp;
    questionIds = knownLocation ? [] : ["location"];
  }

  return questionIds.map((id) => {
    // Ambient variant: hot weather → emphasize cold treat options
    if (id === "treat_type" && ambient?.searchSignals.preferCold) {
      return {
        ...QUESTION_BANK.treat_type,
        question: "What kind of treat? (It's hot out — cold options are great right now!)",
        suggestions: ["Ice cream / gelato", "Cold brew & something sweet", "Donut / pastry", "Bakery item"],
      };
    }
    return QUESTION_BANK[id];
  });
}

// ---------------------------------------------------------------------------
// Helpers (unchanged)
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
