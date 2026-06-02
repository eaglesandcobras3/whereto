import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { getAllFeatureFlags, isSearchInspectorEnabled } from "@/lib/feature-flags";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { getAmbientContext } from "@/lib/ask/ambient-context";
import { buildClarifyingQuestionsWithReasoning } from "@/lib/ask/clarifying-questions";
import {
  detectQueryThemes,
  enrichQueryForContext,
  buildAskSearchQuery,
  extractTownFromText,
  normalizeAskVibeTags,
  type AskQueryThemes,
} from "@/lib/ask/search-input";
import {
  planDiscoveryStrategies,
  resolveSearchFacets,
  type DiscoveryStrategy,
} from "@/lib/ask/discovery-strategies";
import { resolveAskSearchIntent } from "@/lib/ask/resolve-ask-search-intent";
import { normalizeQuery } from "@/lib/query-normalize";
import {
  applyAmbientToSearchQuery,
  planAmbientTimeStrategies,
} from "@/lib/ask/ambient-search";
import { runAskBusinessSearch } from "@/lib/ask/run-ask-business-search";
import { mapSearchToBusinessCards } from "@/lib/ask/artifacts";
import { validateResultsWithOpenAI, type InspectResultItem } from "@/lib/ask/openai-validation";
import { composeClarificationSearchQuery } from "@/lib/ask/clarifying-query";
import { buildZeroResultHints, type InspectReportStrategyRun } from "@/lib/ask/inspect-report";

export const maxDuration = 60;

async function guardInspector(): Promise<NextResponse | null> {
  const flags = await getAllFeatureFlags();
  if (!isSearchInspectorEnabled(flags)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return null;
}

function resolveTownIdFn(supabase: ReturnType<typeof getServiceSupabase>) {
  return async (townOrArea: string): Promise<string | undefined> => {
    const slug = townOrArea.toLowerCase().replace(/\s+/g, "-");
    const { data: town } = await supabase
      .from("towns")
      .select("id")
      .or(`slug.eq.${slug},title.ilike.${townOrArea}`)
      .maybeSingle();
    return town?.id ? String(town.id) : undefined;
  };
}

function themeLabel(key: string): string {
  const labels: Record<string, string> = {
    coffee: "coffee", treats: "treats/dessert", bakery: "bakery", dining: "dining",
    kids: "kid-friendly", bars: "bars & drinks", activities: "activities",
    shopping: "shopping", iceCream: "ice cream", donuts: "donuts",
  };
  return labels[key] ?? key;
}

// ---------------------------------------------------------------------------
// Stage: analyze
// ---------------------------------------------------------------------------

async function handleAnalyze(body: unknown): Promise<NextResponse> {
  const { query } = body as { query: string };
  if (!query?.trim()) {
    return NextResponse.json({ error: "query required" }, { status: 400 });
  }

  const ambient = await getAmbientContext().catch(() => null);
  const rawQuery = query.trim(); // keep original — search does its own enrichment
  const themes = detectQueryThemes(rawQuery);
  const detectedThemes = (Object.entries(themes) as [string, boolean][]).filter(([, v]) => v).map(([k]) => k);

  // Show what enrichments WOULD be applied (display only — search handles this itself)
  const enrichmentsApplied: string[] = [];
  if (ambient) {
    const timeStrategies = planAmbientTimeStrategies(ambient, themes, rawQuery);
    if (timeStrategies.length) {
      enrichmentsApplied.push(
        `Time-of-day search strategies (query unchanged): ${timeStrategies.map((s) => s.label).join(", ")}`,
      );
    }
    const weatherEnriched = applyAmbientToSearchQuery(rawQuery, themes, ambient);
    if (weatherEnriched !== rawQuery) {
      enrichmentsApplied.push(`Weather-only query hint: "${rawQuery}" → "${weatherEnriched}"`);
    }
    if (ambient.searchSignals.preferIndoor) enrichmentsApplied.push("Preferring indoor venues (weather signal)");
    if (ambient.searchSignals.preferCold) enrichmentsApplied.push("Prioritizing cold/refreshing options — it's hot out");
    if (ambient.searchSignals.stormWindow) enrichmentsApplied.push("Afternoon storm window — ranking boost, not query text");
    if (ambient.searchSignals.happyHour && !timeStrategies.some((s) => s.id === "ambient_happy_hour")) {
      enrichmentsApplied.push("Happy hour window active (ranking)");
    }
    if (ambient.searchSignals.impliedMealPeriod && !timeStrategies.length) {
      enrichmentsApplied.push(
        `Time of day implies ${ambient.searchSignals.impliedMealPeriod} (intent scoring only — query unchanged)`,
      );
    }
  }

  const reasoning = buildAnalyzeReasoning(detectedThemes, themes, enrichmentsApplied, ambient);

  return NextResponse.json({
    rawQuery,
    normalizedQuery: normalizeQuery(rawQuery),
    themes,
    detectedThemes,
    enrichmentsApplied,
    reasoning,
    ambient: ambient
      ? {
          weather: `${ambient.weather.condition}${ambient.weather.temperatureF != null ? `, ${Math.round(ambient.weather.temperatureF)}°F` : ""}`,
          timeOfDay: ambient.timeOfDay,
          season: ambient.season,
          crowdLevel: ambient.crowdLevel,
        }
      : null,
  });
}

function buildAnalyzeReasoning(
  detectedThemes: string[],
  themes: AskQueryThemes,
  enrichments: string[],
  ambient: Awaited<ReturnType<typeof getAmbientContext>> | null,
): string {
  const parts: string[] = [];

  if (detectedThemes.length > 0) {
    const labels = detectedThemes.map(themeLabel);
    parts.push(`I detected ${labels.join(" and ")} signals in your query through keyword matching.`);
    if (themes.coffee && themes.treats) {
      parts.push("Because you're asking for both coffee and something sweet, I'll search across Coffee & Cafes AND Bakeries to get better coverage.");
    } else if (themes.coffee) {
      parts.push("Coffee queries typically point to a single category, so this is likely a simple one-strategy search.");
    }
  } else {
    parts.push("No specific category themes detected — I'll rely on semantic (vector) search to find relevant places.");
  }

  if (enrichments.length > 0 && ambient) {
    parts.push(`I also applied ${enrichments.length} real-time adjustment${enrichments.length !== 1 ? "s" : ""} based on current 30A conditions (${ambient.timeOfDay}, ${ambient.weather.condition}).`);
  }

  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Stage: clarify
// ---------------------------------------------------------------------------

async function handleClarify(body: unknown): Promise<NextResponse> {
  const { rawQuery } = body as { rawQuery: string };
  if (!rawQuery?.trim()) {
    return NextResponse.json({ error: "rawQuery required" }, { status: 400 });
  }

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (!openaiKey) {
    return NextResponse.json({ error: "OpenAI key not configured" }, { status: 503 });
  }

  const ambient = await getAmbientContext().catch(() => undefined);
  const decision = await buildClarifyingQuestionsWithReasoning(rawQuery, ambient ?? undefined, undefined);

  return NextResponse.json({
    questions: decision.questions,
    questionReasons: decision.questionReasons,
    skippedQuestions: decision.skippedQuestions,
    questionMeta: decision.questionMeta,
    llmRequestedIds: decision.llmRequestedIds,
    hardRuleIds: decision.hardRuleIds,
    questionBankNote: decision.questionBankNote,
    wouldAsk: decision.wouldAsk,
    reasoning: decision.reasoning,
  });
}

// ---------------------------------------------------------------------------
// Stage: plan
// ---------------------------------------------------------------------------

async function handlePlan(body: unknown): Promise<NextResponse> {
  const {
    rawQuery,
    vibeTags: vibeTagsRaw,
    townOrArea,
    dietaryTags,
    clarifyAnswers,
  } = body as {
    rawQuery: string;
    vibeTags?: string[];
    townOrArea?: string;
    dietaryTags?: string[];
    clarifyAnswers?: string;
  };

  if (!rawQuery?.trim()) {
    return NextResponse.json({ error: "rawQuery required" }, { status: 400 });
  }

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const verbatimQuery = clarifyAnswers?.trim()
    ? composeClarificationSearchQuery(rawQuery.trim(), clarifyAnswers)
    : rawQuery.trim();
  const normalized = normalizeQuery(verbatimQuery);
  const themes = detectQueryThemes(verbatimQuery);
  const vibeTags = normalizeAskVibeTags(vibeTagsRaw, undefined, undefined);
  const resolvedTown =
    townOrArea?.trim() ||
    (clarifyAnswers ? extractTownFromText(`${rawQuery} ${clarifyAnswers}`) : undefined);

  const { intent, facets, intentSource } = await resolveAskSearchIntent({
    verbatimQuery,
    normalized,
    themes,
    toolCategorySlug: null,
    townOrArea: resolvedTown,
    vibeTags,
    dietaryTags,
    model,
    openaiKey,
  });
  const strategies = planDiscoveryStrategies({
    effectiveQuery: verbatimQuery,
    themes,
    toolCategorySlug: null,
    vibeTags,
    intent,
  });

  const primaryStrategies = strategies.filter((s) => s.id !== "broad_relaxed");
  const isSimple = primaryStrategies.length === 1;

  const intentSummary = buildIntentSummary(intent, themes);
  const reasoning = buildPlanReasoning(intent, strategies, isSimple, verbatimQuery);

  const strategyPreviews = strategies.map((s: DiscoveryStrategy) => ({
    id: s.id,
    label: s.label,
    matchHint: s.matchHint,
    categorySlug: s.categorySlug,
    vibeTags: s.vibeTags,
    scopeOverride: s.scopeOverride ?? null,
    sortMode: s.sortMode ?? null,
    weight: s.weight,
  }));

  const capabilityGap = detectCapabilityGap(intent, verbatimQuery);

  return NextResponse.json({
    intent,
    intentSummary,
    strategies: strategyPreviews,
    intentSource,
    searchFacets: {
      active: facets.active,
      signaled: facets.signaled,
      explicitTreat: facets.explicitTreat,
      planComplete: facets.planComplete,
      constraints: facets.constraints,
    },
    isSimple,
    strategyCount: strategies.length,
    reasoning,
    capabilityGap,
  });
}

type CapabilityGap = {
  type: "menu_item";
  items: string[];
  message: string;
  continueMessage: string;
};

function detectCapabilityGap(
  intent: import("@/lib/intent-schema").SearchIntent,
  rawQuery: string,
): CapabilityGap | null {
  const specificItems = intent.specific_items ?? [];
  if (!specificItems.length) return null;

  // Only flag as a gap when the item is clearly menu-level (a specific flavor, dish, or ingredient combo)
  // rather than a category descriptor like "coffee" or "donuts"
  const categoryWords = new Set([
    "coffee", "espresso", "latte", "cappuccino", "cold brew", "tea",
    "donut", "pastry", "croissant", "muffin", "bagel",
    "pizza", "burger", "sandwich", "salad", "tacos", "sushi",
    "ice cream", "gelato", "smoothie", "beer", "cocktail", "wine",
  ]);

  const menuLevelItems = specificItems.filter((item) => {
    const lower = item.toLowerCase();
    // More than 2 words, or contains specific flavor/ingredient not in category words
    if (lower.split(/\s+/).length > 2) return true;
    if (categoryWords.has(lower)) return false;
    // Flavor-like: contains words like "flavor", "flavored", specific descriptors
    const flavorWords = /\b(cream|chocolate|vanilla|strawberry|mint|caramel|cinnamon|lemon|blueberry|peanut|oreo|cookie|brownie|rocky road|birthday cake|mango|coconut)\b/i;
    return flavorWords.test(lower);
  });

  if (!menuLevelItems.length) return null;

  const categoryHint = intent.category
    ? intent.category.toLowerCase()
    : "places in the right category";

  return {
    type: "menu_item",
    items: menuLevelItems,
    message: `You're asking about "${menuLevelItems.join(", ")}" — a specific menu item. We don't have menu data, so we can't tell you which shops carry it or confirm it's available.`,
    continueMessage: `I'll find ${categoryHint} on 30A. You'd need to check their menus directly or call ahead to ask about "${menuLevelItems[0]}".`,
  };
}

function buildIntentSummary(
  intent: import("@/lib/intent-schema").SearchIntent,
  themes: ReturnType<typeof detectQueryThemes>,
): string {
  const parts: string[] = [];
  if (intent.category) parts.push(`Category: **${intent.category}**`);
  if (intent.location?.town) parts.push(`Location: **${intent.location.town}**`);
  if (intent.specific_items?.length) parts.push(`Looking for: ${intent.specific_items.join(", ")}`);
  if (intent.dietary_needs?.length) parts.push(`Dietary: ${intent.dietary_needs.join(", ")}`);
  if (intent.meal_period) parts.push(`Meal: ${intent.meal_period}`);
  if (intent.atmosphere_needs?.length) parts.push(`Atmosphere: ${intent.atmosphere_needs.join(", ")}`);
  if (intent.occasion) parts.push(`Occasion: ${intent.occasion}`);
  const detectedThemeList = (Object.entries(themes) as [string, boolean][]).filter(([, v]) => v).map(([k]) => k);
  if (detectedThemeList.length) parts.push(`Themes: ${detectedThemeList.join(", ")}`);
  return parts.join(" · ");
}

function buildPlanReasoning(
  intent: import("@/lib/intent-schema").SearchIntent,
  strategies: DiscoveryStrategy[],
  isSimple: boolean,
  rawQuery: string,
): string {
  const parts: string[] = [];

  // Lead with what's specific about this query
  if (isSimple) {
    if (intent.category) {
      parts.push(`"${intent.category}" is a clear category — this step mostly just confirms where to search. For a straightforward query like this, intent analysis is quick.`);
    } else {
      parts.push("Your query maps to a single search angle, so this step confirms the category and any extra signals before running one search.");
    }
  } else {
    const strategyLabels = strategies.map((s) => `"${s.label}"`).join(" and ");
    parts.push(`Your query has multiple angles — specifically ${strategyLabels}. Running one search wouldn't cover all of them, so this step plans parallel searches to get better results.`);
  }

  // Specific item caveat — we don't have menu data
  if (intent.specific_items?.length) {
    const items = intent.specific_items.join(", ");
    parts.push(`You mentioned specific item${intent.specific_items.length > 1 ? "s" : ""}: "${items}". Worth knowing: we don't have menu data, so I can find places in the right category that might carry it — but we can't confirm availability. Results will note this.`);
  }

  if (intent.query_type === "vibe") {
    parts.push(`This reads as a vibe search ("${rawQuery}") rather than a category lookup, so semantic similarity carries more weight than keyword matching — which is exactly why parsing intent first matters here.`);
  }

  if (intent.dietary_needs?.length) {
    parts.push(`Dietary filter detected (${intent.dietary_needs.join(", ")}) — this narrows results to places tagged with those restrictions.`);
  }

  if (intent.atmosphere_needs?.length) {
    parts.push(`You want a specific atmosphere (${intent.atmosphere_needs.join(", ")}) — this signals a vibe-weighted search.`);
  }

  const wantsBest = /\b(best|top|must.?try|highly.?rated)\b/i.test(rawQuery);
  if (wantsBest) {
    parts.push('You asked for "best" results — I\'ll weight quality signals (ratings, reviews, featured status) higher than I normally would.');
  }

  if (strategies.some((s) => s.scopeOverride === "near")) {
    parts.push("One strategy will expand to nearby towns if the specific area doesn't have enough results.");
  }

  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Stage: search
// ---------------------------------------------------------------------------

/**
 * Strip conversational filler so "i'm looking for coffee near the kids" → "coffee kids".
 * The production Ask path does this via the LLM tool call; inspector does it here.
 */
function extractSearchKeywords(message: string): string {
  const stopWords =
    /\b(i'm|i've|i'd|i|looking|searching|trying|to|find|a|an|the|near|in|at|by|of|with|some|any|good|best|great|top|like|need|want|would|can|please|where|what|which|are|there|do|you|have|know|got|get|for|tell|me|about|show|help|recommend|something|somewhere|place|places)\b/gi;
  const stripped = message
    .replace(stopWords, " ")
    .replace(/['"?!,.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length >= 3 ? stripped : message.trim();
}

async function handleSearch(body: unknown): Promise<NextResponse> {
  const { rawQuery, townOrArea, vibeTags: vibeTagsRaw, priceLevel, clarifyAnswers } = body as {
    rawQuery: string;
    townOrArea?: string;
    vibeTags?: string[];
    priceLevel?: number;
    clarifyAnswers?: string;
  };

  if (!rawQuery?.trim()) {
    return NextResponse.json({ error: "rawQuery required" }, { status: 400 });
  }

  // Same as production Ask: full original query + clarification answers (no stop-word stripping).
  const verbatimQuery = clarifyAnswers?.trim()
    ? composeClarificationSearchQuery(rawQuery.trim(), clarifyAnswers)
    : rawQuery.trim();
  const searchKeywords = extractSearchKeywords(verbatimQuery);
  const composedQuery = verbatimQuery;

  const townFromClarify =
    townOrArea?.trim() ||
    (clarifyAnswers ? extractTownFromText(`${rawQuery} ${clarifyAnswers}`) : undefined);

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const supabase = getServiceSupabase();
  const ambient = await getAmbientContext().catch(() => undefined);

  const progressEvents: Array<{ stage: string; message: string }> = [];
  const rawStrategyResults: InspectReportStrategyRun[] = [];
  let resolvedConstrainTownId: string | undefined;

  console.log("[inspect/search] query:", rawQuery, "→ keywords:", searchKeywords, "composed:", composedQuery);

  const result = await runAskBusinessSearch({
    input: {
      query: composedQuery,
      town_or_area: townFromClarify,
      tags: vibeTagsRaw,
      price_level: priceLevel,
      limit: 8,
    },
    userMessage: verbatimQuery,
    model,
    openaiKey,
    limit: 8,
    resolveTownId: resolveTownIdFn(supabase),
    onProgress: (e) => progressEvents.push(e),
    ambient,
    includeDebug: true,
    onStrategyResult: (strategyId, label, wave, payload, strategyParams) => {
      const dbg = payload._debug;
      if (dbg?.resolvedTownId) resolvedConstrainTownId = dbg.resolvedTownId;
      rawStrategyResults.push({
        strategyId,
        label,
        wave,
        resultCount: payload.recommendations.length,
        searchQuery: strategyParams?.rawQuery ?? composedQuery,
        categorySlug: strategyParams?.categorySlug ?? null,
        scopeOverride: strategyParams?.scopeOverride ?? null,
        sortMode: strategyParams?.sortMode ?? null,
        vibeTags: strategyParams?.vibeTags,
        retrievalPath: payload._retrieval?.path,
        rpcRowCount: payload._retrieval?.rpc_row_count,
        resolvedTownId: dbg?.resolvedTownId,
        filterCategoryId: dbg?.filterCategoryId ?? null,
        topHits: payload.recommendations.slice(0, 8).map((r) => ({
          title: r.business?.name ?? r.business_id,
          composite: r.score_breakdown?.composite ?? r._composite ?? null,
          vecSimilarity: r.score_breakdown?.vec_similarity ?? r._vec_similarity ?? null,
          category: r.business?.category_name ?? null,
        })),
      });
    },
  });

  const reviewByTitle = new Map(
    result.discovery.reviewNotes.map((n) => [n.title, n.why]),
  );
  const rankedCards = mapSearchToBusinessCards(result.payload, reviewByTitle).slice(0, 8);
  const wave2Triggered = result.attempts.some((a) => a.wave === 2);
  const wave1Attempts = result.attempts.filter((a) => a.wave === 1);
  const wave2Attempts = result.attempts.filter((a) => a.wave === 2);

  const reasoning = buildSearchReasoning(
    wave1Attempts,
    wave2Attempts,
    wave2Triggered,
    rankedCards.length,
    clarifyAnswers?.trim() || undefined,
  );

  const totalResults = result.payload.total_results ?? 0;
  const zeroResultHints =
    totalResults === 0
      ? buildZeroResultHints(rawStrategyResults, result.constrainTownId ?? resolvedConstrainTownId)
      : [];

  console.log("[inspect/search] attempts:", JSON.stringify(result.attempts), "total:", totalResults);

  return NextResponse.json({
    attempts: result.attempts,
    wave2Triggered,
    wave1Hits: wave1Attempts.reduce((s, a) => s + a.resultCount, 0),
    totalResults,
    rankedCards,
    reviewNotes: result.discovery.reviewNotes,
    searchSummary: result.discovery.searchSummary,
    progressEvents,
    reasoning,
    composedQuery,
    searchKeywords,
    rawStrategyResults,
    constrainTownId: result.constrainTownId ?? resolvedConstrainTownId ?? null,
    constrainTownLabel: townFromClarify ?? null,
    resolvedFilters: result.payload.resolved_filters ?? null,
    sharedIntentCategory: result.payload._debug?.intent
      ? (result.payload._debug.intent as { category?: string }).category ?? null
      : null,
    confidence: result.payload.confidence ?? null,
    zeroResultHints,
    pipelineSteps: [
      {
        step: 1,
        name: "Compose query",
        detail: clarifyAnswers
          ? `verbatim="${composedQuery}" (original + clarify chips; keywords debug="${searchKeywords}")`
          : `verbatim="${composedQuery}"`,
      },
      { step: 2, name: "Intent + embed (once)", detail: "Shared across all strategies" },
      { step: 3, name: "Run strategies", detail: `${result.attempts.length} attempt(s), wave2=${wave2Triggered}` },
      { step: 4, name: "Merge + rank", detail: `${totalResults} listings, ${result.discovery.reviewNotes.length} ranked with notes` },
    ],
  });
}

function buildSearchReasoning(
  wave1: Array<{ label: string; resultCount: number }>,
  wave2: Array<{ label: string; resultCount: number }>,
  wave2Triggered: boolean,
  rankedCount: number,
  appliedAnswers?: string,
): string {
  const parts: string[] = [];

  if (appliedAnswers) {
    parts.push(`I incorporated your answers ("${appliedAnswers}") into the search query.`);
  }

  const wave1Total = wave1.reduce((s, a) => s + a.resultCount, 0);
  if (wave1.length === 1) {
    parts.push(`Ran 1 search strategy: "${wave1[0]?.label}" → ${wave1[0]?.resultCount ?? 0} candidates.`);
  } else {
    const strategyList = wave1.map((a) => `"${a.label}" (${a.resultCount})`).join(", ");
    parts.push(`Ran ${wave1.length} search strategies in parallel: ${strategyList}. Combined: ${wave1Total} candidates.`);
  }

  if (wave2Triggered) {
    const wave2List = wave2.map((a) => `"${a.label}"`).join(", ");
    parts.push(`Wave 1 returned fewer than 4 confident matches, so I expanded into ${wave2List} to find more options.`);
  }

  parts.push(`After deduplication and scoring, the top ${rankedCount} results are ranked below — each scored on category match, semantic similarity, listing quality, and data completeness.`);

  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Stage: validate
// ---------------------------------------------------------------------------

async function handleValidate(body: unknown): Promise<NextResponse> {
  const { query, composedQuery, townConstraint, results } = body as {
    query: string;
    composedQuery?: string;
    townConstraint?: string | null;
    results: InspectResultItem[];
  };

  const fullQuery = composedQuery?.trim() || query?.trim();
  if (!fullQuery || !results?.length) {
    return NextResponse.json({ error: "query and results required" }, { status: 400 });
  }

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (!openaiKey) {
    return NextResponse.json({ error: "OpenAI key not configured" }, { status: 503 });
  }

  const validation = await validateResultsWithOpenAI(
    {
      originalQuery: query,
      composedQuery: fullQuery,
      townConstraint: townConstraint ?? null,
      results: results.slice(0, 5),
    },
    openaiKey,
  );
  return NextResponse.json(validation);
}

// ---------------------------------------------------------------------------
// Stage: log-failure
// ---------------------------------------------------------------------------

async function handleLogFailure(body: unknown): Promise<NextResponse> {
  const { query, results, validationScore, validationReason, validationSuggestions } = body as {
    query: string;
    results: InspectResultItem[];
    validationScore: number;
    validationReason: string;
    validationSuggestions: string | null;
  };

  if (!query?.trim()) {
    return NextResponse.json({ error: "query required" }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const normalized = normalizeQuery(query);

  const { data, error } = await supabase
    .from("search_quality_issues")
    .insert({
      issue_type: "bad_result_report",
      severity: validationScore <= 3 ? "high" : "medium",
      raw_query: query,
      normalized_query: normalized,
      details: {
        source: "inspect_validation",
        validation_score: validationScore,
        validation_reason: validationReason,
        validation_suggestions: validationSuggestions,
        results_shown: results.slice(0, 5).map((r) => r.title),
      },
      suggested_fix: validationSuggestions ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[inspect/log-failure]", error);
    return NextResponse.json({ error: "Failed to log issue" }, { status: 500 });
  }

  return NextResponse.json({ loggedId: data.id });
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ stage: string }> },
): Promise<NextResponse> {
  const guard = await guardInspector();
  if (guard) return guard;

  const { stage } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    switch (stage) {
      case "analyze":
        return await handleAnalyze(body);
      case "clarify":
        return await handleClarify(body);
      case "plan":
        return await handlePlan(body);
      case "search":
        return await handleSearch(body);
      case "validate":
        return await handleValidate(body);
      case "log-failure":
        return await handleLogFailure(body);
      default:
        return NextResponse.json({ error: "Unknown stage" }, { status: 404 });
    }
  } catch (err) {
    console.error(`[inspect/${stage}]`, err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
