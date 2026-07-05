import "server-only";

import { getPostHogServerClient } from "@/lib/analytics/posthog-server";
import type { DiscoverParseResolver } from "@/lib/discovery-filters/parse-discover-query-merge";
import type { ParsedDiscoverQuery } from "@/lib/discovery-filters/parse-discover-query";
import { filterTermsMissingFromVocabulary } from "@/lib/discovery-filters/record-discover-search-gaps";

export type DiscoverNlParseTrackInput = {
  rawQuery: string;
  parsed: ParsedDiscoverQuery;
  resolver: DiscoverParseResolver;
  deterministicConfidence: "high" | "low";
  doubtReasons: string[];
  llmAttempted: boolean;
  llmSucceeded: boolean;
  confusedTerms: string[];
  fromCache: boolean;
};

/** PostHog telemetry for every discover NL parse (filter `from_cache` for fresh parses). */
export async function trackDiscoverNlParse(input: DiscoverNlParseTrackInput): Promise<void> {
  const posthog = getPostHogServerClient();
  if (!posthog) return;

  const tags = input.parsed.facet?.split(",").filter(Boolean) ?? [];

  try {
    await posthog.capture({
      distinctId: "discover_nl_system",
      event: "discover_nl_parsed",
      properties: {
        raw_query: input.rawQuery,
        resolver: input.resolver,
        used_llm: input.resolver === "llm" || input.resolver === "hybrid",
        llm_attempted: input.llmAttempted,
        llm_succeeded: input.llmSucceeded,
        deterministic_confidence: input.deterministicConfidence,
        doubt_reasons: input.doubtReasons,
        confused_terms: input.confusedTerms,
        matched_rule_id: input.parsed.deterministicSignals?.matchedRuleId ?? null,
        expanded: input.parsed.expanded,
        parsed_category: input.parsed.category ?? null,
        parsed_service_category: input.parsed.service_category ?? null,
        parsed_town: input.parsed.town ?? null,
        parsed_tags: tags,
        parsed_q: input.parsed.q ?? null,
        from_cache: input.fromCache,
      },
    });
    await posthog.shutdown();
  } catch (err) {
    console.error("trackDiscoverNlParse", err);
  }
}

export function confusedTermsFromParse(
  parsed: ParsedDiscoverQuery,
  vocabulary: ReadonlySet<string>,
): string[] {
  return filterTermsMissingFromVocabulary(parsed.unresolvedTerms ?? [], vocabulary);
}
