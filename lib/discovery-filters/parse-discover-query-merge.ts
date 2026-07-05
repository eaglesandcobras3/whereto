import {
  normalizeServiceCategoryGroupSlug,
  normalizeStorefrontCategoryGroupSlug,
} from "@/lib/discovery-filters/category-group-slugs";
import type { DiscoverNlLlmParse } from "@/lib/discovery-filters/parse-discover-query-llm";
import type { ParsedDiscoverQuery } from "@/lib/discovery-filters/parse-discover-query";

export type DiscoverParseResolver = "deterministic" | "llm" | "hybrid";

function dedupe(items: string[]): string[] {
  return [...new Set(items)];
}

/** True when deterministic parsing should be augmented with LLM. */
export function needsDiscoverLlmFallback(parsed: ParsedDiscoverQuery): boolean {
  if (!parsed.expanded) return true;
  return (parsed.unresolvedTerms?.length ?? 0) > 0;
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
    expanded,
    resolver,
  };
}
