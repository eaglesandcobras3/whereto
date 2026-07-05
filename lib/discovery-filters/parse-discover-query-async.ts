import "server-only";

import {
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
  filterTermsMissingFromVocabulary,
  loadSearchTagVocabulary,
  recordDiscoverSearchGaps,
} from "@/lib/discovery-filters/record-discover-search-gaps";
import { normalizeQuery } from "@/lib/query-normalize";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 500;

type CacheEntry = { at: number; value: ParsedDiscoverQuery };

const parseCache = new Map<string, CacheEntry>();

export type ParseDiscoverQueryAsyncResult = ParsedDiscoverQuery & {
  resolver: DiscoverParseResolver;
};

function getCached(key: string): ParsedDiscoverQuery | null {
  const hit = parseCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    parseCache.delete(key);
    return null;
  }
  return hit.value;
}

function setCached(key: string, value: ParsedDiscoverQuery): void {
  if (parseCache.size >= CACHE_MAX) {
    const oldest = parseCache.keys().next().value;
    if (oldest) parseCache.delete(oldest);
  }
  parseCache.set(key, { at: Date.now(), value });
}

function withResolver(
  parsed: ParsedDiscoverQuery,
  resolver: DiscoverParseResolver,
): ParseDiscoverQueryAsyncResult {
  return { ...parsed, resolver };
}

function scheduleGapRecording(
  parsed: ParsedDiscoverQuery,
  vocabulary: ReadonlySet<string>,
  rawQuery: string,
): void {
  const terms = filterTermsMissingFromVocabulary(parsed.unresolvedTerms ?? [], vocabulary);
  if (!terms.length) return;

  void recordDiscoverSearchGaps({
    rawQuery,
    unresolvedTerms: terms,
    parsedCategory: parsed.category,
    parsedTown: parsed.town,
    parsedTags: parsed.facet?.split(",").filter(Boolean),
    expanded: parsed.expanded,
  }).catch((err) => console.error("scheduleGapRecording", err));
}

/**
 * Hybrid discover NL parse: deterministic fast path, then low-cost LLM when needed.
 * Loads live vocabulary, caches by normalized query, records unresolved terms.
 */
export async function parseDiscoverQueryAsync(
  rawQuery: string,
): Promise<ParseDiscoverQueryAsyncResult> {
  const trimmed = rawQuery.trim();
  if (!trimmed) return withResolver({ expanded: false }, "deterministic");

  const cacheKey = normalizeQuery(trimmed);
  const cached = getCached(cacheKey);
  if (cached) {
    return withResolver(cached, cached.resolver ?? "deterministic");
  }

  const vocabulary = await loadSearchTagVocabulary();
  let parsed = parseDiscoverQuery(trimmed, { vocabulary });
  let resolver: DiscoverParseResolver = "deterministic";

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  if (needsDiscoverLlmFallback(parsed) && apiKey && vocabulary.size > 0) {
    const llm = await parseDiscoverQueryWithLlm(trimmed, vocabulary, apiKey, model);
    if (llm) {
      parsed = mergeDiscoverLlmParse(parsed, llm, vocabulary);
      resolver = parsed.resolver ?? "hybrid";
    }
  }

  parsed = { ...parsed, resolver };
  scheduleGapRecording(parsed, vocabulary, trimmed);
  setCached(cacheKey, parsed);

  return withResolver(parsed, resolver);
}

/** @internal Test helper — clears in-memory parse cache. */
export function clearDiscoverParseCacheForTests(): void {
  parseCache.clear();
}
