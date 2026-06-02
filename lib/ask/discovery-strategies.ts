import { normalizeBusinessCategorySlug } from "@/lib/search/category-slugs";
import type { AskQueryThemes } from "@/lib/ask/search-input";
import type { SearchIntent } from "@/lib/intent-schema";
import type { SearchCandidateRankOrder } from "@/lib/scoring";
import {
  buildStrategiesFromFacets,
  explicitTreatFacet,
} from "@/lib/ask/search-facet-strategies";
import { primaryFacetFromActive, resolveSearchFacets } from "@/lib/ask/search-facets";

export type DiscoveryStrategy = {
  id: string;
  label: string;
  rawQuery: string;
  categorySlug: string | null;
  vibeTags?: string[];
  /** Ranking weight when merging (higher = prefer this strategy's hits). */
  weight: number;
  matchHint: string;
  /** Optional sort mode — "quality" for "best of" queries. */
  sortMode?: SearchCandidateRankOrder;
  /** Scope override — "near" expands to adjacent towns. */
  scopeOverride?: "in" | "near" | "anywhere";
  /** When true, restrict to service businesses (photographers, chefs, etc.). */
  requiredIsServiceBusiness?: boolean;
};

type PlanInput = {
  effectiveQuery: string;
  themes: AskQueryThemes;
  toolCategorySlug: string | null;
  vibeTags?: string[];
  intent?: SearchIntent;
};

/**
 * Plan complementary search passes from resolved search facets (not ad-hoc theme if/else).
 */
export function planDiscoveryStrategies(input: PlanInput): DiscoveryStrategy[] {
  const { effectiveQuery, themes, vibeTags, toolCategorySlug, intent } = input;

  const facets = resolveSearchFacets({
    effectiveQuery,
    themes,
    toolCategorySlug,
    intent,
  });

  const wantsBest = /\b(best|top|greatest|favorite|must.?try|highly.?rated)\b/i.test(effectiveQuery);

  const strategies = buildStrategiesFromFacets(facets.active, {
    effectiveQuery,
    vibeTags,
    wantsBest,
    explicitTreatFacet: explicitTreatFacet(facets.explicitTreat),
    primaryFacet: primaryFacetFromActive(facets.active),
  });

  const push = (s: DiscoveryStrategy) => {
    if (strategies.some((x) => x.id === s.id)) return;
    strategies.push(s);
  };

  // Intent-specific items — extra pass when we have room
  if (intent?.specific_items?.length && strategies.length < 3) {
    const itemQuery = intent.specific_items.join(" ");
    push({
      id: "specific_items",
      label: "Specific items",
      rawQuery: itemQuery,
      categorySlug: toolCategorySlug ?? (themes.dining ? "restaurants" : null),
      vibeTags: undefined,
      weight: 0.9,
      matchHint: intent.specific_items.slice(0, 2).join(", "),
    });
  }

  // Tool category not covered by facet map
  if (
    toolCategorySlug &&
    !strategies.some((s) => s.categorySlug === toolCategorySlug) &&
    toolCategorySlug !== "coffee_shops"
  ) {
    push({
      id: `tool_${toolCategorySlug}`,
      label: toolCategorySlug.replace(/_/g, " "),
      rawQuery: effectiveQuery,
      categorySlug: toolCategorySlug,
      vibeTags,
      weight: 0.97,
      matchHint: toolCategorySlug.replace(/_/g, " "),
      sortMode: wantsBest ? "relevance" : undefined,
    });
  }

  if (strategies.length === 0) {
    push({
      id: "default",
      label: "General search",
      rawQuery: effectiveQuery,
      categorySlug: toolCategorySlug,
      vibeTags,
      weight: 1,
      matchHint: "your request",
    });
  }

  return strategies.slice(0, 4);
}

/**
 * Generate Wave 2 expansion strategies when Wave 1 results are sparse.
 */
export function planWave2Strategies(
  wave1: DiscoveryStrategy[],
  opts: {
    effectiveQuery: string;
    constrainTownId: string | undefined;
    vibeTags: string[] | undefined;
  },
): DiscoveryStrategy[] {
  const strategies: DiscoveryStrategy[] = [];
  const push = (s: DiscoveryStrategy) => {
    if (wave1.some((x) => x.id === s.id)) return;
    strategies.push(s);
  };

  const primaryCat = wave1[0]?.categorySlug ?? null;
  const hasTownConstraint = Boolean(opts.constrainTownId);

  if (hasTownConstraint) {
    push({
      id: "scope_expand_near",
      label: "Nearby areas",
      rawQuery: opts.effectiveQuery,
      categorySlug: primaryCat,
      vibeTags: opts.vibeTags,
      weight: 0.8,
      matchHint: "nearby areas",
      scopeOverride: "near",
    });
  }

  if (opts.vibeTags?.length) {
    push({
      id: "relax_vibes",
      label: "Relaxed search",
      rawQuery: opts.effectiveQuery,
      categorySlug: primaryCat,
      vibeTags: undefined,
      weight: 0.72,
      matchHint: "broader options",
    });
  }

  if (primaryCat === "bars") {
    push({
      id: "bars_restaurants_expand",
      label: "Bars & restaurants",
      rawQuery: opts.effectiveQuery,
      categorySlug: "restaurants",
      vibeTags: undefined,
      weight: 0.7,
      matchHint: "restaurants with a bar",
    });
  }

  if (primaryCat === "coffee_shops") {
    push({
      id: "coffee_restaurant_expand",
      label: "Cafes & eateries",
      rawQuery: `${opts.effectiveQuery} cafe coffee`,
      categorySlug: "restaurants",
      vibeTags: undefined,
      weight: 0.7,
      matchHint: "café or eatery",
    });
  }

  if (strategies.length === 0) {
    strategies.push({
      id: "broad_relaxed",
      label: "Broader search",
      rawQuery: opts.effectiveQuery,
      categorySlug: wave1[0]?.categorySlug ?? null,
      vibeTags: undefined,
      weight: 0.72,
      matchHint: "broader match",
    });
  }

  return strategies.slice(0, 2);
}

export function toolCategoryFromInput(category?: string): string | null {
  return normalizeBusinessCategorySlug(category);
}

/** Exposed for inspector / debug UIs. */
export { resolveSearchFacets } from "@/lib/ask/search-facets";
