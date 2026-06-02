import "server-only";

import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

export type InspectResultItem = {
  title: string;
  category: string | null;
  town: string | null;
  /** Why our ranker surfaced this listing (optional). */
  match_reason?: string | null;
};

export type ValidateResultsInput = {
  /** Original user message (before chips). */
  originalQuery?: string;
  /** Full intent: original + clarifying chip answers — use this as primary. */
  composedQuery: string;
  /** Town the user chose or we resolved (e.g. Rosemary Beach). */
  townConstraint?: string | null;
  results: InspectResultItem[];
};

export type ValidationResult = {
  score: number;
  isGood: boolean;
  reasoning: string;
  suggestions: string | null;
  alternativeAnswer: string | null;
  promptSent: string;
};

const validationSchema = z.object({
  score: z.number().int().min(1).max(10).describe("1–10 quality rating"),
  reasoning: z
    .string()
    .describe("Plain-English explanation referencing the specific business names and why they do or don't fit"),
  suggestions: z
    .string()
    .nullable()
    .describe("Specific suggestions for improving the search (missing categories, tag gaps, etc.) — null if results are good"),
  alternativeAnswer: z
    .string()
    .nullable()
    .describe(
      "If score < 7: a direct answer to the user's query based on your knowledge of 30A — what types of places or specific well-known businesses would better serve this request? Be specific about what the ideal result set should look like. Only reference businesses you genuinely know exist on 30A. Null if results are good.",
    ),
});

export async function validateResultsWithOpenAI(
  input: ValidateResultsInput,
  openaiKey: string,
): Promise<ValidationResult> {
  const { composedQuery, originalQuery, townConstraint, results } = input;

  const resultList = results
    .map((r, i) => {
      const head = `${i + 1}. ${r.title}${r.category ? ` — ${r.category}` : ""}${r.town ? `, ${r.town}` : ""}`;
      const why = r.match_reason?.trim();
      return why ? `${head}\n   Why we ranked it: ${why}` : head;
    })
    .join("\n");

  const locationBlock = townConstraint?.trim()
    ? `
LOCATION CONSTRAINT (from user's clarifying answers — mandatory):
The user asked for places in or immediately around **${townConstraint.trim()}**.
- Listings in ${townConstraint.trim()} are preferred.
- Results in other towns (Seaside, Grayton, etc.) are only acceptable if clearly labeled as nearby fallbacks and the in-town options are weak or missing.
- Do NOT suggest ideal results primarily in distant towns when the user named ${townConstraint.trim()}.
`
    : "";

  const prompt = `You are evaluating search results for WhereTo30A, a curated discovery app for Florida's 30A beach corridor. The corridor includes towns like Seaside, Rosemary Beach, Grayton Beach, Alys Beach, WaterColor, WaterSound, Santa Rosa Beach, Blue Mountain Beach, and Inlet Beach.

Judge whether OUR search results fit the user's FULL intent (including clarifying chip answers), not a shortened version of the question.

Original question: "${originalQuery?.trim() || composedQuery}"
Full search intent (original + clarifying answers): "${composedQuery}"
${locationBlock}
Results returned by our search system (top ${results.length}):
${resultList}

Rate how well these results answer the FULL intent on a scale of 1–10:
- 9–10: Excellent — right category/vibe and respects location if specified
- 7–8: Good — relevant choices; minor geography or category tradeoffs OK
- 4–6: Partial — wrong category, wrong town, or misses obvious in-town options
- 1–3: Poor — does not answer what they asked

Be specific. Reference business names and towns shown above. If location was specified, penalize results in the wrong town.

If score < 7, alternativeAnswer must respect the same location constraint — describe ideal results IN the requested town first, then nearby only as secondary. Reference only well-known 30A businesses you are confident exist; do not invent names.`;

  const { object } = await generateObject({
    model: openai(process.env.OPENAI_MODEL ?? "gpt-4o-mini"),
    schema: validationSchema,
    prompt,
  });

  return {
    score: object.score,
    isGood: object.score >= 7,
    reasoning: object.reasoning,
    suggestions: object.suggestions,
    alternativeAnswer: object.alternativeAnswer,
    promptSent: prompt,
  };
}
