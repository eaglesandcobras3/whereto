import "server-only";

import {
  describeDiscoverParseDoubt,
  mergeDiscoverLlmParse,
  needsDiscoverLlmFallback,
  type DiscoverParseResolver,
} from "@/lib/discovery-filters/parse-discover-query-merge";
import { parseDiscoverQueryWithLlm } from "@/lib/discovery-filters/parse-discover-query-llm";
import {
  parseDiscoverQuery,
  type ParsedDiscoverQuery,
} from "@/lib/discovery-filters/parse-discover-query";
import {
  loadSearchTagVocabulary,
  recordDiscoverSearchGaps,
} from "@/lib/discovery-filters/record-discover-search-gaps";
import {
  confusedTermsFromParse,
  trackDiscoverNlParse,
  type DiscoverNlParseTrackInput,
} from "@/lib/discovery-filters/track-discover-nl-parse";
import { normalizeQuery } from "@/lib/query-normalize";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 500;

type CacheEntry = {
  at: number;
  value: ParsedDiscoverQuery;
  telemetry: DiscoverNlParseTelemetry;
};

const parseCache = new Map<string, CacheEntry>();

export type DiscoverNlParseTelemetry = {
  resolver: DiscoverParseResolver;
  used_llm: boolean;
  llm_attempted: boolean;
  llm_succeeded: boolean;
  deterministic_confidence: "high" | "low";
  doubt_reasons: string[];
  confused_terms: string[];
  matched_rule_id?: string;
  from_cache: boolean;
};

export type ParseDiscoverQueryAsyncResult = ParsedDiscoverQuery & {
  resolver: DiscoverParseResolver;
  telemetry: DiscoverNlParseTelemetry;
};

function getCached(key: string): CacheEntry | null {
  const hit = parseCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    parseCache.delete(key);
    return null;
  }
  return hit;
}

function setCached(key: string, value: ParsedDiscoverQuery, telemetry: DiscoverNlParseTelemetry): void {
  if (parseCache.size >= CACHE_MAX) {
    const oldest = parseCache.keys().next().value;
    if (oldest) parseCache.delete(oldest);
  }
  parseCache.set(key, { at: Date.now(), value, telemetry });
}

function buildTelemetry(
  input: Omit<DiscoverNlParseTrackInput, "fromCache">,
): DiscoverNlParseTelemetry {
  return {
    resolver: input.resolver,
    used_llm: input.resolver === "llm" || input.resolver === "hybrid",
    llm_attempted: input.llmAttempted,
    llm_succeeded: input.llmSucceeded,
    deterministic_confidence: input.deterministicConfidence,
    doubt_reasons: input.doubtReasons,
    confused_terms: input.confusedTerms,
    matched_rule_id: input.parsed.deterministicSignals?.matchedRuleId,
    from_cache: false,
  };
}

function scheduleGapRecording(
  parsed: ParsedDiscoverQuery,
  confusedTerms: string[],
  rawQuery: string,
): void {
  if (!confusedTerms.length) return;

  void recordDiscoverSearchGaps({
    rawQuery,
    unresolvedTerms: confusedTerms,
    parsedCategory: parsed.category,
    parsedTown: parsed.town,
    parsedTags: parsed.facet?.split(",").filter(Boolean),
    expanded: parsed.expanded,
  }).catch((err) => console.error("scheduleGapRecording", err));
}

function scheduleParseTracking(
  input: Omit<DiscoverNlParseTrackInput, "fromCache">,
): DiscoverNlParseTelemetry {
  const telemetry = buildTelemetry(input);
  void trackDiscoverNlParse({ ...input, fromCache: false }).catch((err) =>
    console.error("scheduleParseTracking", err),
  );
  return telemetry;
}

/**
 * Hybrid discover NL parse: deterministic fast path, then low-cost LLM unless the
 * rule match is extremely confident. Loads live vocabulary, caches, records gaps.
 */
export async function parseDiscoverQueryAsync(
  rawQuery: string,
): Promise<ParseDiscoverQueryAsyncResult> {
  const trimmed = rawQuery.trim();
  if (!trimmed) {
    const emptyTelemetry: DiscoverNlParseTelemetry = {
      resolver: "deterministic",
      used_llm: false,
      llm_attempted: false,
      llm_succeeded: false,
      deterministic_confidence: "low",
      doubt_reasons: ["not_expanded"],
      confused_terms: [],
      from_cache: false,
    };
    return { expanded: false, resolver: "deterministic", telemetry: emptyTelemetry };
  }

  const cacheKey = normalizeQuery(trimmed);
  const cached = getCached(cacheKey);
  if (cached) {
    void trackDiscoverNlParse({
      rawQuery: trimmed,
      parsed: cached.value,
      resolver: cached.telemetry.resolver,
      deterministicConfidence: cached.telemetry.deterministic_confidence,
      doubtReasons: cached.telemetry.doubt_reasons,
      llmAttempted: cached.telemetry.llm_attempted,
      llmSucceeded: cached.telemetry.llm_succeeded,
      confusedTerms: cached.telemetry.confused_terms,
      fromCache: true,
    }).catch((err) => console.error("trackDiscoverNlParse cache", err));

    return {
      ...cached.value,
      resolver: cached.telemetry.resolver,
      telemetry: { ...cached.telemetry, from_cache: true },
    };
  }

  const vocabulary = await loadSearchTagVocabulary();
  let parsed = parseDiscoverQuery(trimmed, { vocabulary });
  const deterministicDoubt = describeDiscoverParseDoubt(parsed);
  let resolver: DiscoverParseResolver = "deterministic";
  let llmAttempted = false;
  let llmSucceeded = false;

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const shouldTryLlm = needsDiscoverLlmFallback(parsed) && Boolean(apiKey) && vocabulary.size > 0;

  if (shouldTryLlm) {
    llmAttempted = true;
    const llm = await parseDiscoverQueryWithLlm(trimmed, vocabulary, apiKey!, model);
    if (llm) {
      llmSucceeded = true;
      parsed = mergeDiscoverLlmParse(parsed, llm, vocabulary);
      resolver = parsed.resolver ?? "hybrid";
    }
  }

  parsed = { ...parsed, resolver };
  const confusedTerms = confusedTermsFromParse(parsed, vocabulary);
  scheduleGapRecording(parsed, confusedTerms, trimmed);

  const telemetry = scheduleParseTracking({
    rawQuery: trimmed,
    parsed,
    resolver,
    deterministicConfidence: deterministicDoubt.confidence,
    doubtReasons: deterministicDoubt.doubtReasons,
    llmAttempted,
    llmSucceeded,
    confusedTerms,
  });

  setCached(cacheKey, parsed, telemetry);

  return { ...parsed, resolver, telemetry };
}

/** @internal Test helper — clears in-memory parse cache. */
export function clearDiscoverParseCacheForTests(): void {
  parseCache.clear();
}
