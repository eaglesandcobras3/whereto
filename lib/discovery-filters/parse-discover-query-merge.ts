import type { DiscoverNlLlmParse } from "@/lib/discovery-filters/parse-discover-query-llm";
import type {
  DeterministicParseSignals,
  ParsedDiscoverQuery,
} from "@/lib/discovery-filters/parse-discover-query";
import {
  normalizeServiceCategoryGroupSlug,
  normalizeStorefrontCategoryGroupSlug,
} from "@/lib/discovery-filters/category-group-slugs";

export type DiscoverParseResolver = "deterministic" | "llm" | "hybrid";

function dedupe(items: string[]): string[] {
  return [...new Set(items)];
}

/**
 * Skip LLM only when deterministic parsing hit a search-query rule with no doubt signals.
 * Any heuristic, alias, theme, residual text, or unresolved term → use LLM.
 */
export function isExtremelyConfidentDeterministicParse(
  parsed: ParsedDiscoverQuery,
  signals: DeterministicParseSignals | undefined,
): boolean {
  if (!parsed.expanded || !signals) return false;
  if ((parsed.unresolvedTerms?.length ?? 0) > 0) return false;
  if (signals.hasResidualQ) return false;
  if (signals.usedHeuristicCategory) return false;
  if (signals.usedAliasOrThemeCategory) return false;
  if (!signals.matchedRuleId) return false;

  return Boolean(
    parsed.category ||
      parsed.service_category ||
      parsed.facet ||
      parsed.town ||
      parsed.type,
  );
}

/** True unless deterministic parse is extremely confident — default is LLM. */
export function needsDiscoverLlmFallback(parsed: ParsedDiscoverQuery): boolean {
  return !isExtremelyConfidentDeterministicParse(
    parsed,
    parsed.deterministicSignals,
  );
}

/** Merge LLM output into deterministic parse; deterministic wins on conflicts. */
export function mergeDiscoverLlmParse(
  deterministic: ParsedDiscoverQuery,
  llm: DiscoverNlLlmParse,
  vocabulary: ReadonlySet<string>,
): ParsedDiscoverQuery {
  const detTags = deterministic.facet?.split(",").filter(Boolean) ?? [];
  const llmTags = llm.tags.filter((t) => vocabulary.has(t));
  const allTags = dedupe([...detTags, ...llmTags]);

  const category =
    deterministic.category ??
    (llm.category ? normalizeStorefrontCategoryGroupSlug(llm.category) : undefined);
  const service_category =
    deterministic.service_category ??
    (llm.service_category
      ? normalizeServiceCategoryGroupSlug(llm.service_category)
      : undefined);

  const town = deterministic.town ?? llm.town ?? undefined;

  let type = deterministic.type ?? llm.type ?? undefined;
  if (!type) {
    if (service_category) type = "services";
    else if (category) type = "storefront";
  }

  const q = deterministic.q?.trim() || llm.residual_q?.trim() || undefined;

  const unresolvedTerms = dedupe([
    ...(llm.unresolved_terms ?? []),
    ...(deterministic.unresolvedTerms ?? []),
  ]);

  const expanded = Boolean(
    town || category || service_category || allTags.length > 0 || type,
  );

  const resolver: DiscoverParseResolver = deterministic.expanded ? "hybrid" : "llm";

  return {
    type,
    town,
    category,
    service_category,
    facet: allTags.length ? allTags.join(",") : undefined,
    q: expanded ? q : deterministic.q ?? q,
    unresolvedTerms: unresolvedTerms.length ? unresolvedTerms : undefined,
    deterministicSignals: deterministic.deterministicSignals,
    expanded,
    resolver,
  };
}
