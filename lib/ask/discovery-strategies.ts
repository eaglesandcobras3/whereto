import { normalizeBusinessCategorySlug } from "@/lib/search/category-slugs";
import type { AskQueryThemes } from "@/lib/ask/search-input";
import type { SearchIntent } from "@/lib/intent-schema";
import type { SearchCandidateRankOrder } from "@/lib/scoring";

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
  /** Pre-resolved intent — used to detect specific items and service queries. */
  intent?: SearchIntent;
};

/**
 * Plan complementary search passes from question context (not one rigid filter set).
 */
export function planDiscoveryStrategies(input: PlanInput): DiscoveryStrategy[] {
  const { effectiveQuery, themes, vibeTags } = input;
  const toolCat = input.toolCategorySlug;
  const intent = input.intent;
  const strategies: DiscoveryStrategy[] = [];

  const push = (s: DiscoveryStrategy) => {
    if (strategies.some((x) => x.id === s.id)) return;
    strategies.push(s);
  };

  const wantsCoffee = themes.coffee || toolCat === "coffee_shops";
  const wantsTreats = themes.treats || themes.bakery || themes.iceCream || themes.donuts;
  const wantsBest = /\b(best|top|greatest|favorite|must.?try|highly.?rated)\b/i.test(effectiveQuery);
  const wantsService =
    toolCat === "services" ||
    /\b(photographer|photography|private\s+chef|catering|massage|therapist|hair|stylist|wedding|event\s+planner)\b/i.test(effectiveQuery);

  if (wantsCoffee) {
    push({
      id: "coffee_shops",
      label: "Coffee & cafes",
      rawQuery: effectiveQuery,
      categorySlug: "coffee_shops",
      vibeTags,
      weight: 1,
      matchHint: "coffee or café",
      sortMode: wantsBest ? "relevance" : undefined,
    });
  }

  if (wantsTreats || themes.bakery) {
    push({
      id: "bakery_restaurants",
      label: "Bakery & pastries",
      rawQuery: `${effectiveQuery} bakery pastries muffins`,
      categorySlug: "restaurants",
      vibeTags,
      weight: 0.93,
      matchHint: "bakery goods and pastries",
    });
  }

  if (themes.iceCream || (wantsTreats && themes.kids)) {
    push({
      id: "dessert_sweets",
      label: "Ice cream & sweets",
      rawQuery: `${effectiveQuery} ice cream gelato donut sweet treats`,
      categorySlug: "restaurants",
      vibeTags,
      weight: 0.88,
      matchHint: "desserts, ice cream, or sweet treats",
    });
  }

  if (themes.dining && !wantsCoffee && toolCat === "restaurants") {
    push({
      id: "restaurants",
      label: "Restaurants",
      rawQuery: effectiveQuery,
      categorySlug: "restaurants",
      vibeTags,
      weight: 0.95,
      matchHint: "dining",
      sortMode: wantsBest ? "relevance" : undefined,
    });
  }

  if (toolCat === "bars" || themes.bars) {
    push({
      id: "bars",
      label: "Bars & drinks",
      rawQuery: effectiveQuery,
      categorySlug: "bars",
      vibeTags,
      weight: 0.95,
      matchHint: "drinks",
    });
  }

  if (toolCat === "shopping" || themes.shopping) {
    push({
      id: "shopping",
      label: "Shopping",
      rawQuery: effectiveQuery,
      categorySlug: "shopping",
      vibeTags,
      weight: 0.95,
      matchHint: "shopping",
    });
  }

  if (toolCat === "activities" || themes.activities) {
    push({
      id: "activities",
      label: "Activities",
      rawQuery: effectiveQuery,
      categorySlug: "activities",
      vibeTags,
      weight: 0.95,
      matchHint: "activities",
    });
  }

  // Service businesses (photographers, chefs, etc.) — separate from storefronts
  if (wantsService) {
    push({
      id: "services",
      label: "Services",
      rawQuery: effectiveQuery,
      categorySlug: "services",
      vibeTags,
      weight: 0.97,
      matchHint: "local service providers",
      requiredIsServiceBusiness: true,
    });
  }

  // Specific items from intent — targeted ILIKE angle in addition to semantic
  if (intent?.specific_items?.length && strategies.length < 3) {
    const itemQuery = intent.specific_items.join(" ");
    push({
      id: "specific_items",
      label: "Specific items",
      rawQuery: itemQuery,
      categorySlug: toolCat ?? (themes.dining ? "restaurants" : null),
      vibeTags: undefined, // strip vibes so items aren't over-filtered
      weight: 0.9,
      matchHint: intent.specific_items.slice(0, 2).join(", "),
    });
  }

  // Tool category not yet covered
  if (
    toolCat &&
    !strategies.some((s) => s.categorySlug === toolCat) &&
    toolCat !== "coffee_shops"
  ) {
    push({
      id: `tool_${toolCat}`,
      label: toolCat.replace(/_/g, " "),
      rawQuery: effectiveQuery,
      categorySlug: toolCat,
      vibeTags,
      weight: 0.97,
      matchHint: toolCat.replace(/_/g, " "),
      sortMode: wantsBest ? "relevance" : undefined,
    });
  }

  // Note: broad_relaxed is intentionally NOT added here for single-strategy queries.
  // For simple queries ("coffee in rosemary"), Wave 0 runs first; if it succeeds,
  // broad_relaxed is never needed. If Wave 0 fails, planWave2Strategies handles expansion.
  // Adding broad_relaxed here would run an extra search on every simple query unnecessarily.

  if (strategies.length === 0) {
    push({
      id: "default",
      label: "General search",
      rawQuery: effectiveQuery,
      categorySlug: toolCat,
      vibeTags,
      weight: 1,
      matchHint: "your request",
    });
  }

  return strategies.slice(0, 4);
}

/**
 * Generate Wave 2 expansion strategies when Wave 1 results are sparse.
 * Expansion strategies inherit the same intent — no extra LLM call.
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

  // Scope expansion: if we searched "in" a specific town, expand to "near" (adjacent towns)
  if (hasTownConstraint) {
    push({
      id: "scope_expand_near",
      label: "Nearby areas",
      rawQuery: opts.effectiveQuery,
      categorySlug: primaryCat,
      vibeTags: opts.vibeTags,
      weight: 0.80,
      matchHint: "nearby areas",
      scopeOverride: "near",
    });
  }

  // Constraint relaxation: remove vibe tags, keep category
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

  // Related category: if bars found nothing, try restaurants (food + drinks overlap)
  if (primaryCat === "bars") {
    push({
      id: "bars_restaurants_expand",
      label: "Bars & restaurants",
      rawQuery: opts.effectiveQuery,
      categorySlug: "restaurants",
      vibeTags: undefined,
      weight: 0.70,
      matchHint: "restaurants with a bar",
    });
  }

  // Related category: if coffee_shops found nothing, try restaurants (cafes in restaurant category)
  if (primaryCat === "coffee_shops") {
    push({
      id: "coffee_restaurant_expand",
      label: "Cafes & eateries",
      rawQuery: `${opts.effectiveQuery} cafe coffee`,
      categorySlug: "restaurants",
      vibeTags: undefined,
      weight: 0.70,
      matchHint: "café or eatery",
    });
  }

  // Broad fallback: same category, no vibe filters — fires as last resort in Wave 2
  // when the primary strategies didn't find enough.
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

  return strategies.slice(0, 2); // At most 2 expansion strategies per wave
}

export function toolCategoryFromInput(category?: string): string | null {
  return normalizeBusinessCategorySlug(category);
}
