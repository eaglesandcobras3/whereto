import "server-only";

import {
  planDiscoveryStrategies,
  planWave2Strategies,
  toolCategoryFromInput,
  type DiscoveryStrategy,
} from "@/lib/ask/discovery-strategies";
import { primaryFacetFromActive, resolveSearchFacets } from "@/lib/ask/search-facets";
import { rankMergedDiscoveryResults } from "@/lib/ask/rank-merged-results";
import {
  buildAskSearchQuery,
  detectQueryThemes,
  enrichQueryForContext,
  isCorridorPlaceholder,
  normalizeAskVibeTags,
  userMentionedBudget,
} from "@/lib/ask/search-input";
import { normalizeQuery } from "@/lib/query-normalize";
import { resolveAskSearchIntent } from "@/lib/ask/resolve-ask-search-intent";
import { embedNormalizedSearchQuery } from "@/lib/search/query-embedding";
import { searchQueryEmbeddingsEnabled } from "@/lib/search/search-openai-flags";
import { runSearch } from "@/lib/search/run-search";
import { priceLevelToBucket } from "@/lib/search/search-plan";
import type { SearchResultPayload } from "@/lib/search/types";
import type { SearchIntent } from "@/lib/intent-schema";
import type { AmbientContext } from "@/lib/ask/ambient-context";
import {
  ambientRankBoostsFromContext,
  applyAmbientToSearchQuery,
  formatRelevantEventsForDiscovery,
  matchRelevantEvents,
  mergeDiscoveryStrategies,
  planAmbientTimeStrategies,
} from "@/lib/ask/ambient-search";
import {
  applySessionTownToInput,
  type SessionSearchHints,
} from "@/lib/ask/session-context";

export type AskSearchBusinessesInput = {
  query: string;
  town_or_area?: string;
  category?: string;
  tags?: string[];
  dietary_tags?: string[];
  atmosphere_tags?: string[];
  occasion_tags?: string[];
  price_level?: number;
  limit?: number;
};

export type AskSearchAttemptMeta = {
  label: string;
  strategyId: string;
  resultCount: number;
  wave: 1 | 2;
};

export type AskDiscoveryReviewNote = {
  rank: number;
  business_id: string;
  title: string;
  score: number;
  strategies: string[];
  why: string;
};

export type AskSearchProgress = {
  stage: "searching" | "expanding" | "ranking" | "done";
  message: string;
};

export type AskBusinessSearchResult = {
  payload: SearchResultPayload;
  categorySlug: string | null;
  constrainTownId?: string;
  rawQuery: string;
  vibeTags?: string[];
  priceLevel?: number;
  attempts: AskSearchAttemptMeta[];
  discovery: {
    themes: string[];
    strategyLabels: string[];
    reviewNotes: AskDiscoveryReviewNote[];
    /** Human-readable search summary shown to user as "thinking" status. */
    searchSummary: string;
    /** How shared intent was built (inspect / debug). */
    intentSource?: import("@/lib/ask/search-facets").IntentSource;
    searchFacets?: import("@/lib/ask/search-facets").ResolvedSearchFacets;
  };
};

type RunOpts = {
  input: AskSearchBusinessesInput;
  userMessage?: string;
  model: string;
  openaiKey: string | undefined;
  limit: number;
  resolveTownId: (townOrArea: string) => Promise<string | undefined>;
  /** Optional callback fired at each search stage for streaming UX. */
  onProgress?: (event: AskSearchProgress) => void;
  /** Ambient context (weather, season) to adjust strategies. */
  ambient?: AmbientContext;
  /** Session memory from prior turns in this conversation. */
  sessionHints?: SessionSearchHints;
  /** Optional callback fired after each individual strategy completes — for debug/inspect only. */
  onStrategyResult?: (
    strategyId: string,
    label: string,
    wave: 1 | 2,
    payload: SearchResultPayload,
    strategyParams?: {
      rawQuery: string;
      categorySlug: string | null;
      scopeOverride?: DiscoveryStrategy["scopeOverride"];
      sortMode?: DiscoveryStrategy["sortMode"];
      vibeTags?: string[];
    },
  ) => void;
  /** Populate `_debug` / retrieval on each strategy payload (inspect / admin). */
  includeDebug?: boolean;
};

// ---------------------------------------------------------------------------
// Single-strategy search wrapper
// ---------------------------------------------------------------------------

async function runOneSearch(opts: {
  rawQuery: string;
  model: string;
  openaiKey: string | undefined;
  limit: number;
  categorySlug: string | null;
  constrainTownId?: string;
  vibeTags?: string[];
  priceLevel?: number;
  sortMode?: DiscoveryStrategy["sortMode"];
  scopeOverride?: DiscoveryStrategy["scopeOverride"];
  requiredIsServiceBusiness?: boolean;
  precomputedIntent?: SearchIntent;
  precomputedQueryEmbedding?: number[] | null;
  includeDebug?: boolean;
}): Promise<SearchResultPayload> {
  return runSearch({
    rawQuery: opts.rawQuery,
    model: opts.model,
    openaiKey: opts.openaiKey,
    pageSize: opts.limit,
    constrainTownId: opts.scopeOverride !== "near" ? opts.constrainTownId : undefined,
    constrainTownIds: opts.scopeOverride === "near" && opts.constrainTownId
      ? undefined // let scopeOverride handle town expansion inside runSearch
      : undefined,
    scopeOverride: opts.scopeOverride,
    constrainCategorySlug: opts.categorySlug,
    constrainPriceBucket: priceLevelToBucket(opts.priceLevel),
    constrainVibeTags: opts.vibeTags,
    sortMode: opts.sortMode,
    requiredIsServiceBusiness: opts.requiredIsServiceBusiness,
    precomputedIntent: opts.precomputedIntent,
    precomputedQueryEmbedding: opts.precomputedQueryEmbedding,
    includeDebug: opts.includeDebug ?? false,
  });
}

// ---------------------------------------------------------------------------
// Query complexity + quality helpers
// ---------------------------------------------------------------------------

/**
 * A query is "simple" when a single primary strategy will likely cover it:
 * clear category + location, no secondary themes, no dietary/vibe/occasion signals.
 *
 * "coffee in rosemary" → simple (1 strategy: coffee_shops)
 * "coffee place with treats" → complex (2 strategies: coffee_shops + bakery_restaurants)
 * "gluten-free breakfast kids waterfront" → complex (dietary + group + atmosphere)
 */
function isSimpleQuery(strategies: DiscoveryStrategy[]): boolean {
  const primaryStrategies = strategies.filter((s) => s.id !== "broad_relaxed");
  return primaryStrategies.length === 1;
}

/** How many unique results have composite ≥ threshold across all payloads. */
function countHighConfidenceResults(
  payloads: SearchResultPayload[],
  threshold = 0.45,
): number {
  let count = 0;
  const seen = new Set<string>();
  for (const p of payloads) {
    for (const r of p.recommendations) {
      if (seen.has(r.business_id)) continue;
      seen.add(r.business_id);
      const composite = r.score_breakdown?.composite ?? r._composite ?? 0;
      if (composite >= threshold) count++;
    }
  }
  return count;
}

/** Wave 0 is sufficient if it returned ≥ 3 high-confidence results. */
const WAVE0_SUFFICIENT_COUNT = 3;

function strategyInspectParams(strategy: DiscoveryStrategy) {
  return {
    rawQuery: strategy.rawQuery,
    categorySlug: strategy.categorySlug,
    scopeOverride: strategy.scopeOverride,
    sortMode: strategy.sortMode,
    vibeTags: strategy.vibeTags,
  };
}

/** Parallel near-town passes — ranked below in-town hits via merge scoring. */
function appendNearTownStrategies(
  strategies: DiscoveryStrategy[],
  constrainTownId: string | undefined,
): DiscoveryStrategy[] {
  if (!constrainTownId) return strategies;
  const out = [...strategies];
  const seen = new Set(strategies.map((s) => s.id));
  for (const s of strategies) {
    if (s.scopeOverride || s.id.endsWith("_near")) continue;
    const nearId = `${s.id}_near`;
    if (seen.has(nearId)) continue;
    seen.add(nearId);
    out.push({
      ...s,
      id: nearId,
      label: `${s.label} (nearby)`,
      weight: Math.min(s.weight * 0.78, 0.82),
      scopeOverride: "near",
      matchHint: `nearby — ${s.matchHint}`,
    });
  }
  return out.slice(0, 6);
}

// ---------------------------------------------------------------------------
// Final result builder (shared by Wave 0 early return and full pipeline exit)
// ---------------------------------------------------------------------------

function buildFinalResult(args: {
  strategyResults: Array<{ strategy: DiscoveryStrategy; payload: SearchResultPayload }>;
  strategies: DiscoveryStrategy[];
  attempts: AskSearchAttemptMeta[];
  opts: RunOpts;
  rawQuery: string;
  toolCategorySlug: string | null;
  constrainTownId: string | undefined;
  vibeTags: string[] | undefined;
  priceLevel: number | undefined;
  themeList: string[];
  waveNote: string | null;
  eventNote?: string;
  intentSource?: import("@/lib/ask/search-facets").IntentSource;
  searchFacets?: import("@/lib/ask/search-facets").ResolvedSearchFacets;
}): AskBusinessSearchResult {
  const {
    strategyResults,
    strategies,
    attempts,
    opts,
    rawQuery,
    toolCategorySlug,
    constrainTownId,
    vibeTags,
    priceLevel,
    themeList,
    waveNote,
    eventNote,
    intentSource,
    searchFacets,
  } = args;
  const themes = detectQueryThemes(rawQuery);
  const primaryFacet = searchFacets
    ? primaryFacetFromActive(searchFacets.active)
    : primaryFacetFromActive(
        resolveSearchFacets({
          effectiveQuery: rawQuery,
          themes,
          toolCategorySlug,
          vibeTags,
          ambient: opts.ambient,
        }).active,
      );

  const ranked = rankMergedDiscoveryResults({
    strategies: strategyResults.map((r) => r.strategy),
    payloads: strategyResults,
    primaryQuery: rawQuery,
    limit: opts.limit,
    wantKids: themes.kids,
    wantTreats: themes.treats || themes.bakery || themes.iceCream || themes.donuts,
    primaryFacet,
    anchorTownName: searchFacets?.constraints.townOrArea ?? null,
    ambientBoosts: opts.ambient ? ambientRankBoostsFromContext(opts.ambient) : undefined,
  });

  const wave2Attempts = attempts.filter((a) => a.wave === 2);
  const totalFound = ranked.payload.total_results ?? 0;
  const strategyNames = [...new Set(attempts.filter((a) => a.resultCount > 0).map((a) => a.label))];
  let searchSummary = strategyNames.length === 1
    ? `Searched: ${strategyNames[0]}. Found ${totalFound} verified listings.`
    : `Searched across: ${strategyNames.join(", ")}. Found ${totalFound} verified listings.`;
  if (wave2Attempts.length > 0) {
    searchSummary += ` Search expanded into ${wave2Attempts.map((a) => a.label).join(", ")}.`;
  }
  if (waveNote) searchSummary += ` ${waveNote}`;
  if (eventNote) searchSummary += ` ${eventNote}`;

  return {
    payload: ranked.payload,
    categorySlug: toolCategorySlug,
    constrainTownId,
    rawQuery,
    vibeTags,
    priceLevel,
    attempts,
    discovery: {
      themes: themeList,
      strategyLabels: strategies.map((s) => s.label),
      reviewNotes: ranked.reviewNotes,
      searchSummary,
      intentSource,
      searchFacets,
    },
  };
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

/**
 * Context-aware discovery: resolve intent ONCE, run multiple search strategies,
 * optionally expand (Wave 2) when results are sparse, merge and re-rank.
 *
 * Cost: 1 intent parse + 1 embedding (shared across all strategies) instead of N×each.
 */
export async function runAskBusinessSearch(opts: RunOpts): Promise<AskBusinessSearchResult> {
  const userMessage = opts.userMessage ?? "";
  const searchInput = applySessionTownToInput(opts.input, opts.sessionHints);
  // Keep the user's full wording (incl. clarification chips); do not strip to keywords.
  const verbatimQuery = buildAskSearchQuery(searchInput.query, userMessage);
  const themes = detectQueryThemes(verbatimQuery);
  // User wording stays intact; only light weather hints may append (never time-of-day).
  const rawQuery = opts.ambient
    ? applyAmbientToSearchQuery(enrichQueryForContext(verbatimQuery), themes, opts.ambient)
    : enrichQueryForContext(verbatimQuery);

  const relevantEvents =
    opts.ambient?.todayEvents?.length
      ? matchRelevantEvents(
          opts.ambient.todayEvents,
          rawQuery,
          searchInput.town_or_area ?? opts.sessionHints?.knownTown,
        )
      : [];
  const eventNote = formatRelevantEventsForDiscovery(relevantEvents);
  const themeList = Object.entries(themes)
    .filter(([, v]) => v)
    .map(([k]) => k);
  const toolCategorySlug = toolCategoryFromInput(searchInput.category);
  const vibeTags = normalizeAskVibeTags(
    searchInput.tags,
    searchInput.atmosphere_tags,
    searchInput.occasion_tags,
  );
  const priceLevel = userMentionedBudget(userMessage) ? searchInput.price_level : undefined;

  let constrainTownId: string | undefined;
  if (searchInput.town_or_area && !isCorridorPlaceholder(searchInput.town_or_area)) {
    constrainTownId = await opts.resolveTownId(searchInput.town_or_area);
  }

  // ---------------------------------------------------------------------------
  // Resolve intent ONCE — shared across all strategies.
  // ---------------------------------------------------------------------------

  const normalized = normalizeQuery(verbatimQuery);
  const model = opts.model;
  const openaiKey = opts.openaiKey;

  const canEmbed = Boolean(openaiKey) && searchQueryEmbeddingsEnabled();

  let sharedIntent: SearchIntent | undefined;
  let sharedEmbedding: number[] | null | undefined;
  let intentSource: import("@/lib/ask/search-facets").IntentSource | undefined;
  let searchFacets: import("@/lib/ask/search-facets").ResolvedSearchFacets | undefined;

  opts.onProgress?.({ stage: "searching", message: "Understanding your search…" });
  const intentPromise = resolveAskSearchIntent({
    verbatimQuery,
    normalized,
    themes,
    toolCategorySlug,
    townOrArea: searchInput.town_or_area,
    vibeTags,
    dietaryTags: searchInput.dietary_tags,
    priceLevel: priceLevel ?? null,
    occasion: searchInput.occasion_tags?.[0],
    sessionHints: opts.sessionHints,
    ambient: opts.ambient,
    model,
    openaiKey,
  });

  if (canEmbed && openaiKey) {
    const [resolved, embedding] = await Promise.all([
      intentPromise,
      embedNormalizedSearchQuery(normalized, openaiKey),
    ]);
    sharedIntent = resolved.intent;
    intentSource = resolved.intentSource;
    searchFacets = resolved.facets;
    sharedEmbedding = embedding;
  } else {
    const resolved = await intentPromise;
    sharedIntent = resolved.intent;
    intentSource = resolved.intentSource;
    searchFacets = resolved.facets;
  }

  const facetTown = searchFacets?.constraints.townOrArea;
  if (!constrainTownId && facetTown && !isCorridorPlaceholder(facetTown)) {
    constrainTownId = await opts.resolveTownId(facetTown);
  }

  // ---------------------------------------------------------------------------
  // Plan strategies
  // ---------------------------------------------------------------------------

  const coreStrategies = planDiscoveryStrategies({
    effectiveQuery: verbatimQuery,
    themes,
    toolCategorySlug,
    vibeTags,
    intent: sharedIntent,
  });
  const ambientStrategies = opts.ambient
    ? planAmbientTimeStrategies(opts.ambient, themes, verbatimQuery, {
        facetMealPeriod: searchFacets?.constraints.mealPeriod,
      })
    : [];
  let strategies = mergeDiscoveryStrategies(coreStrategies, ambientStrategies);
  strategies = appendNearTownStrategies(strategies, constrainTownId);

  const perStrategyLimit = Math.min(10, Math.max(6, opts.limit + 2));
  const simple = isSimpleQuery(strategies);

  // ---------------------------------------------------------------------------
  // Wave 0: for simple queries (single clear category + location) run one fast
  // search first. If results are good enough, return immediately — skip the full
  // multi-strategy run entirely. If weak, escalate to Wave 1.
  // "coffee in rosemary" → Wave 0 only (if ≥3 confident hits).
  // "coffee place with treats" → skips Wave 0, goes straight to Wave 1.
  // ---------------------------------------------------------------------------

  let strategyResults: Array<{ strategy: DiscoveryStrategy; payload: SearchResultPayload }> = [];
  const attempts: AskSearchAttemptMeta[] = [];

  if (simple) {
    const primaryStrategy = strategies.find((s) => s.id !== "broad_relaxed")!;
    opts.onProgress?.({ stage: "searching", message: "Searching…" });

    const wave0Payload = await runOneSearch({
      rawQuery: primaryStrategy.rawQuery,
      model,
      openaiKey,
      limit: perStrategyLimit,
      categorySlug: primaryStrategy.categorySlug,
      constrainTownId,
      vibeTags: primaryStrategy.vibeTags,
      priceLevel,
      sortMode: primaryStrategy.sortMode,
      scopeOverride: primaryStrategy.scopeOverride,
      requiredIsServiceBusiness: primaryStrategy.requiredIsServiceBusiness,
      precomputedIntent: sharedIntent,
      precomputedQueryEmbedding: sharedEmbedding,
      includeDebug: opts.includeDebug,
    });

    attempts.push({
      label: primaryStrategy.label,
      strategyId: primaryStrategy.id,
      resultCount: wave0Payload.recommendations.length,
      wave: 1,
    });

    const wave0Confident = countHighConfidenceResults([wave0Payload]);

    opts.onStrategyResult?.(
      primaryStrategy.id,
      primaryStrategy.label,
      1,
      wave0Payload,
      strategyInspectParams(primaryStrategy),
    );

    if (wave0Confident >= WAVE0_SUFFICIENT_COUNT) {
      // Wave 0 nailed it — return early, don't run more searches.
      opts.onProgress?.({ stage: "done", message: `Found ${wave0Payload.total_results ?? 0} places` });
      return buildFinalResult({
        strategyResults: [{ strategy: primaryStrategy, payload: wave0Payload }],
        strategies: [primaryStrategy],
        attempts,
        opts,
        rawQuery,
        toolCategorySlug,
        constrainTownId,
        vibeTags,
        priceLevel,
        themeList,
        waveNote: null,
        eventNote,
        intentSource,
        searchFacets,
      });
    }

    // Wave 0 was weak — fall through to full Wave 1 with all strategies.
    opts.onProgress?.({
      stage: "searching",
      message: `Expanding search across ${strategies.length} angle${strategies.length !== 1 ? "s" : ""}…`,
    });
  } else {
    opts.onProgress?.({
      stage: "searching",
      message: `Searching across ${strategies.length} angle${strategies.length !== 1 ? "s" : ""}…`,
    });
  }

  // ---------------------------------------------------------------------------
  // Wave 1: full multi-strategy in parallel
  // ---------------------------------------------------------------------------

  strategyResults = await Promise.all(
    strategies.map(async (strategy) => {
      const payload = await runOneSearch({
        rawQuery: strategy.rawQuery,
        model,
        openaiKey,
        limit: perStrategyLimit,
        categorySlug: strategy.categorySlug,
        constrainTownId,
        vibeTags: strategy.vibeTags,
        priceLevel,
        sortMode: strategy.sortMode,
        scopeOverride: strategy.scopeOverride,
        requiredIsServiceBusiness: strategy.requiredIsServiceBusiness,
        precomputedIntent: sharedIntent,
        precomputedQueryEmbedding: sharedEmbedding,
        includeDebug: opts.includeDebug,
      });
      return { strategy, payload };
    }),
  );

  for (const { strategy, payload } of strategyResults) {
    // Don't double-count a Wave 0 strategy that was already attempted
    if (!attempts.some((a) => a.strategyId === strategy.id)) {
      attempts.push({
        label: strategy.label,
        strategyId: strategy.id,
        resultCount: payload.recommendations.length,
        wave: 1 as const,
      });
      opts.onStrategyResult?.(
        strategy.id,
        strategy.label,
        1,
        payload,
        strategyInspectParams(strategy),
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Programmatic reflection: count high-confidence results after Wave 1.
  // If sparse, run Wave 2 without any extra LLM call.
  // ---------------------------------------------------------------------------

  const wave1Payloads = strategyResults.map((r) => r.payload);
  const highConfidenceCount = countHighConfidenceResults(wave1Payloads);
  const totalWave1Hits = attempts.reduce((s, a) => s + a.resultCount, 0);

  if (highConfidenceCount < 4 && totalWave1Hits > 0) {
    const wave2Strategies = planWave2Strategies(strategies, {
      effectiveQuery: rawQuery,
      constrainTownId,
      vibeTags,
    });

    if (wave2Strategies.length > 0) {
      opts.onProgress?.({
        stage: "expanding",
        message: "Expanding search to find more options…",
      });

      const wave2Results = await Promise.all(
        wave2Strategies.map(async (strategy) => {
          const payload = await runOneSearch({
            rawQuery: strategy.rawQuery,
            model,
            openaiKey,
            limit: perStrategyLimit,
            categorySlug: strategy.categorySlug,
            constrainTownId,
            vibeTags: strategy.vibeTags,
            priceLevel,
            sortMode: strategy.sortMode,
            scopeOverride: strategy.scopeOverride,
            requiredIsServiceBusiness: strategy.requiredIsServiceBusiness,
            precomputedIntent: sharedIntent,
            precomputedQueryEmbedding: sharedEmbedding,
            includeDebug: opts.includeDebug,
          });
          return { strategy, payload };
        }),
      );

      for (const { strategy, payload } of wave2Results) {
        strategyResults.push({ strategy, payload });
        attempts.push({
          label: strategy.label,
          strategyId: strategy.id,
          resultCount: payload.recommendations.length,
          wave: 2 as const,
        });
        opts.onStrategyResult?.(
          strategy.id,
          strategy.label,
          2,
          payload,
          strategyInspectParams(strategy),
        );
      }
    }
  } else if (totalWave1Hits === 0) {
    opts.onProgress?.({ stage: "expanding", message: "Trying a broader search…" });

    const runFallback = async (
      id: string,
      label: string,
      params: {
        categorySlug: string | null;
        scopeOverride?: DiscoveryStrategy["scopeOverride"];
      },
    ) => {
      const payload = await runOneSearch({
        rawQuery,
        model,
        openaiKey,
        limit: opts.limit,
        categorySlug: params.categorySlug,
        constrainTownId,
        vibeTags: undefined,
        priceLevel: undefined,
        sortMode: undefined,
        scopeOverride: params.scopeOverride,
        precomputedIntent: sharedIntent,
        precomputedQueryEmbedding: sharedEmbedding,
        includeDebug: opts.includeDebug,
      });
      attempts.push({
        label,
        strategyId: id,
        resultCount: payload.recommendations.length,
        wave: 2,
      });
      opts.onStrategyResult?.(id, label, 2, payload, {
        rawQuery,
        categorySlug: params.categorySlug,
        scopeOverride: params.scopeOverride,
        sortMode: undefined,
        vibeTags: undefined,
      });
      return payload;
    };

    // Escalate: same town any category → nearby towns with primary category → nearby any category
    const fallbackSteps: Array<{ id: string; label: string; categorySlug: string | null; scopeOverride?: DiscoveryStrategy["scopeOverride"] }> = [
      { id: "fallback_town_browse", label: "Same town, any category", categorySlug: null },
      {
        id: "fallback_near_category",
        label: "Nearby areas",
        categorySlug: toolCategorySlug,
        scopeOverride: constrainTownId ? "near" : undefined,
      },
      { id: "fallback_near_browse", label: "Nearby, any category", categorySlug: null, scopeOverride: constrainTownId ? "near" : undefined },
    ];

    for (const step of fallbackSteps) {
      const payload = await runFallback(step.id, step.label, step);
      if (payload.recommendations.length > 0) {
        strategyResults = [
          {
            strategy: {
              id: step.id,
              label: step.label,
              rawQuery,
              categorySlug: step.categorySlug,
              weight: 1,
              matchHint: "expanded match",
              scopeOverride: step.scopeOverride,
            },
            payload,
          },
        ];
        break;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Merge, re-rank, explain
  // ---------------------------------------------------------------------------

  opts.onProgress?.({ stage: "ranking", message: "Ranking the best matches for you…" });

  const result = buildFinalResult({
    strategyResults,
    strategies,
    attempts,
    opts,
    rawQuery,
    toolCategorySlug,
    constrainTownId,
    vibeTags,
    priceLevel,
    themeList,
    waveNote: null,
    eventNote,
    intentSource,
    searchFacets,
  });

  opts.onProgress?.({ stage: "done", message: `Found ${result.payload.total_results ?? 0} places` });
  return result;
}
