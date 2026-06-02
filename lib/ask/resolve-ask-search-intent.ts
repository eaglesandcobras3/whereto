import "server-only";

import {
  fallbackIntentFromKeywords,
  parseIntentWithOpenAI,
  repairFoodCategoryWhenQueryIsRetail,
  shouldSkipOpenAiIntentParse,
  tryKeywordIntentMatch,
} from "@/lib/ai/search-ai";
import type { AmbientContext } from "@/lib/ask/ambient-context";
import { isVagueFoodQuery } from "@/lib/ask/ambient-search";
import {
  buildIntentFromFacets,
  mergeIntentWithFacetConstraints,
} from "@/lib/ask/search-facet-intent";
import {
  resolveSearchFacets,
  type IntentSource,
  type ResolvedSearchFacets,
} from "@/lib/ask/search-facets";
import type { AskQueryThemes } from "@/lib/ask/search-input";
import type { SessionSearchHints } from "@/lib/ask/session-context";
import { searchIntentSchema, type SearchIntent } from "@/lib/intent-schema";
import { searchOpenAiIntentParseEnabled } from "@/lib/search/search-openai-flags";

export type { IntentSource };

export type ResolveAskSearchIntentInput = {
  verbatimQuery: string;
  normalized: string;
  themes: AskQueryThemes;
  toolCategorySlug: string | null;
  townOrArea?: string | null;
  vibeTags?: string[];
  dietaryTags?: string[];
  priceLevel?: number | null;
  occasion?: string | null;
  sessionHints?: SessionSearchHints;
  ambient?: AmbientContext;
  model: string;
  openaiKey: string | undefined;
};

export type ResolveAskSearchIntentResult = {
  intent: SearchIntent;
  facets: ResolvedSearchFacets;
  intentSource: IntentSource;
};

/**
 * Resolve shared search intent for Ask discovery — prefer facet plan, then keyword
 * heuristics, then OpenAI parse. Facet constraints always win over LLM for town,
 * dietary, meal, and vibe fields we already know from clarify/session.
 */
export async function resolveAskSearchIntent(
  input: ResolveAskSearchIntentInput,
): Promise<ResolveAskSearchIntentResult> {
  const facets = resolveSearchFacets({
    effectiveQuery: input.verbatimQuery,
    themes: input.themes,
    toolCategorySlug: input.toolCategorySlug,
    townOrArea: input.townOrArea,
    vibeTags: input.vibeTags,
    dietaryTags: input.dietaryTags,
    priceLevel: input.priceLevel,
    occasion: input.occasion,
    sessionTown: input.sessionHints?.knownTown,
    ambient: input.ambient,
  });

  const finish = (intent: SearchIntent, intentSource: IntentSource): ResolveAskSearchIntentResult => {
    const merged = mergeIntentWithFacetConstraints(intent, facets);
    const parsed = searchIntentSchema.parse(
      repairFoodCategoryWhenQueryIsRetail(merged, input.normalized),
    );
    return { intent: parsed, facets, intentSource };
  };

  if (facets.planComplete) {
    return finish(
      buildIntentFromFacets(facets, {
        normalized: input.normalized,
        toolCategorySlug: input.toolCategorySlug,
      }),
      "facet_plan",
    );
  }

  if (!input.openaiKey) {
    const kw = tryKeywordIntentMatch(input.normalized);
    const intent = kw ?? buildIntentFromFacets(facets, {
      normalized: input.normalized,
      toolCategorySlug: input.toolCategorySlug,
    });
    return finish(intent, kw ? "keyword_heuristic" : "facet_plan");
  }

  if (!searchOpenAiIntentParseEnabled()) {
    const kw = tryKeywordIntentMatch(input.normalized);
    const intent =
      kw ??
      buildIntentFromFacets(facets, {
        normalized: input.normalized,
        toolCategorySlug: input.toolCategorySlug,
      });
    return finish(intent, kw ? "keyword_heuristic" : "facet_plan");
  }

  if (shouldSkipOpenAiIntentParse(input.normalized)) {
    return finish(tryKeywordIntentMatch(input.normalized)!, "keyword_heuristic");
  }

  try {
    const intent = await parseIntentWithOpenAI(
      input.model,
      input.openaiKey,
      input.verbatimQuery,
      input.normalized,
    );
    return finish(intent, "openai");
  } catch {
    const kw = tryKeywordIntentMatch(input.normalized);
    const intent = kw ?? fallbackIntentFromKeywords(input.normalized);
    return finish(intent, kw ? "keyword_heuristic" : "keyword_heuristic");
  }
}

/** Whether ambient meal strategies would duplicate facet meal planning. */
export function ambientMealCoveredByFacets(
  verbatimQuery: string,
  facets: ResolvedSearchFacets,
): boolean {
  return Boolean(facets.constraints.mealPeriod && isVagueFoodQuery(verbatimQuery));
}
