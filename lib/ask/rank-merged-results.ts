import type { SearchResultPayload } from "@/lib/search/types";
import type { DiscoveryStrategy } from "@/lib/ask/discovery-strategies";
import {
  FACET_STRATEGY_ID,
  type SearchFacetId,
} from "@/lib/ask/search-facets";
import {
  listingMatchesAmbientBoost,
  type AmbientRankBoosts,
} from "@/lib/ask/ambient-search";

type ScoredRec = SearchResultPayload["recommendations"][number] & {
  _strategyIds: string[];
  _strategyLabels: string[];
  _matchHints: string[];
  _strategyWeight: number;
};

function baseScore(rec: SearchResultPayload["recommendations"][number]): number {
  const sb = rec.score_breakdown;
  if (sb?.composite != null) return sb.composite;
  if (rec._composite != null) return rec._composite;
  if (rec._vec_similarity != null) return rec._vec_similarity;
  return 0.45;
}

function listingText(rec: SearchResultPayload["recommendations"][number]): string {
  return `${rec.business.name} ${rec.explanation} ${rec.business.ai_summary ?? ""} ${rec.business.category_name ?? ""}`.toLowerCase();
}

/** Coffee shop category or café/coffee in the listing name. */
function isCoffeeVenue(rec: SearchResultPayload["recommendations"][number]): boolean {
  const cat = (rec.business.category_name ?? "").toLowerCase();
  if (cat.includes("coffee")) return true;
  const name = (rec.business.name ?? "").toLowerCase();
  return /\b(coffee|cafe|café|espresso|roaster)\b/.test(name);
}

function normalizeTownToken(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function listingMatchesAnchorTown(
  rec: SearchResultPayload["recommendations"][number],
  anchorTown: string,
): boolean {
  const anchor = normalizeTownToken(anchorTown);
  const listingTown = normalizeTownToken(rec.business.town_name ?? "");
  if (!listingTown || !anchor) return false;
  if (listingTown === anchor) return true;
  if (listingTown.includes(anchor) || anchor.includes(listingTown)) return true;
  return false;
}

/** Prefer in-town listings; penalize wrong-town when user named a town. */
function anchorTownRankingAdjustments(
  rec: ScoredRec,
  anchorTown: string | null | undefined,
): number {
  if (!anchorTown?.trim()) return 0;
  const inTown = listingMatchesAnchorTown(rec, anchorTown);
  const nearScope = rec._strategyIds.some((id) => id.endsWith("_near"));
  if (inTown) return 0.14;
  if (nearScope) return -0.04;
  const listingTown = rec.business.town_name?.trim();
  if (listingTown) return -0.1;
  return -0.05;
}

function isFullServiceRestaurant(rec: SearchResultPayload["recommendations"][number]): boolean {
  const text = listingText(rec);
  if (isCoffeeVenue(rec)) return false;
  return /\b(restaurant|grill|steakhouse|tapas|bistro|lounge|cocktail|dining)\b/.test(text);
}

function kidFriendlyBoost(
  rec: SearchResultPayload["recommendations"][number],
  wantKids: boolean,
): number {
  if (!wantKids) return 0;
  const tags = [
    ...((rec.business.tags as string[] | undefined) ?? []),
    ...(((rec as { intent_tags?: string[] }).intent_tags as string[] | undefined) ?? []),
  ].map((t) => t.toLowerCase());
  if (tags.some((t) => t.includes("kid") || t.includes("family"))) return 0.08;
  if (/\b(kid|family|children)\b/.test(listingText(rec))) return 0.05;
  return 0;
}

function treatsBoost(
  rec: SearchResultPayload["recommendations"][number],
  wantTreats: boolean,
  primaryFacet: SearchFacetId | null,
): number {
  if (!wantTreats) return 0;
  const text = listingText(rec);
  const treatWords =
    /\b(bakery|pastry|donut|ice\s*cream|gelato|cookie|sweet|treat|cupcake|muffin)\b/.test(text);

  if (primaryFacet === "coffee") {
    if (isCoffeeVenue(rec) && treatWords) return 0.07;
    if (isCoffeeVenue(rec)) return 0.03;
    return 0;
  }

  if (treatWords) return 0.1;
  if (/\b(chocolate)\b/.test(text) && isCoffeeVenue(rec)) return 0.06;
  return 0;
}

/**
 * When the user asked for coffee (primary), prefer coffee-shop hits over
 * restaurants that only matched the secondary bakery pass.
 */
function primaryFacetRankingAdjustments(
  rec: ScoredRec,
  primaryFacet: SearchFacetId | null,
): number {
  if (primaryFacet !== "coffee") return 0;

  const coffeeStrategyId = FACET_STRATEGY_ID.coffee;
  const bakeryStrategyId = FACET_STRATEGY_ID.bakery;
  const coffeeHit = rec._strategyIds.includes(coffeeStrategyId);
  const bakeryOnlyHit =
    rec._strategyIds.includes(bakeryStrategyId) && !coffeeHit;

  let adj = 0;
  if (isCoffeeVenue(rec)) adj += 0.18;
  if (coffeeHit) adj += 0.05;
  if (bakeryOnlyHit && !isCoffeeVenue(rec)) adj -= 0.16;
  if (bakeryOnlyHit && isFullServiceRestaurant(rec)) adj -= 0.1;

  return adj;
}

function buildRankExplanation(entry: ScoredRec): string {
  const hints = [...new Set(entry._matchHints)];
  const labels = [...new Set(entry._strategyLabels)];
  const via = labels.length > 1 ? labels.join(" + ") : labels[0] ?? "search";
  const hintText = hints.length ? hints.slice(0, 2).join(", ") : "verified listing";

  const sb = entry.score_breakdown;
  const signals: string[] = [];

  if (sb) {
    if (sb.structured_match >= 0.7) signals.push("strong category match");
    else if (sb.structured_match >= 0.35) signals.push("partial category match");
    if (sb.vec_similarity >= 0.55) signals.push("high semantic relevance");
    else if (sb.vec_similarity >= 0.38) signals.push("good semantic match");
    if (sb.data_quality >= 0.85) signals.push("well-documented listing");
    if (sb.learning_boost > 0) signals.push("popular for similar searches");
    if (sb.geo_score >= 0.8) signals.push("very close");
    else if (sb.geo_score >= 0.6) signals.push("nearby");
  }

  const scoreContext = signals.length ? ` (${signals.slice(0, 2).join(", ")})` : "";

  if (entry._strategyIds.length > 1) {
    return `Strong fit across ${via}: ${hintText}${scoreContext}.`;
  }
  return `Matched for ${hintText} via ${via}${scoreContext}.`;
}

export type RankedDiscoveryResult = {
  payload: SearchResultPayload;
  reviewNotes: Array<{
    rank: number;
    business_id: string;
    title: string;
    score: number;
    strategies: string[];
    why: string;
  }>;
};

/**
 * Merge multi-strategy search hits, re-rank, and attach explainable match reasons.
 */
export function rankMergedDiscoveryResults(opts: {
  strategies: DiscoveryStrategy[];
  payloads: Array<{ strategy: DiscoveryStrategy; payload: SearchResultPayload }>;
  primaryQuery: string;
  limit: number;
  wantKids: boolean;
  wantTreats: boolean;
  /** When set, listings matching this facet (e.g. coffee) rank above secondary passes. */
  primaryFacet?: SearchFacetId | null;
  /** User-selected or inferred town — in-town ranks above nearby-town results. */
  anchorTownName?: string | null;
  ambientBoosts?: AmbientRankBoosts;
}): RankedDiscoveryResult {
  const primaryFacet = opts.primaryFacet ?? null;
  const byId = new Map<string, ScoredRec>();

  for (const { strategy, payload } of opts.payloads) {
    for (const rec of payload.recommendations) {
      const existing = byId.get(rec.business_id);
      if (existing) {
        existing._strategyIds.push(strategy.id);
        existing._strategyLabels.push(strategy.label);
        existing._matchHints.push(strategy.matchHint);
        existing._strategyWeight = Math.max(existing._strategyWeight, strategy.weight);
        const score = baseScore(rec);
        if (score > baseScore(existing)) {
          existing.explanation = rec.explanation;
          existing.headline = rec.headline;
          existing.score_breakdown = rec.score_breakdown;
          existing._composite = rec._composite;
          existing._vec_similarity = rec._vec_similarity;
        }
      } else {
        byId.set(rec.business_id, {
          ...rec,
          _strategyIds: [strategy.id],
          _strategyLabels: [strategy.label],
          _matchHints: [strategy.matchHint],
          _strategyWeight: strategy.weight,
        });
      }
    }
  }

  const scored = [...byId.values()].map((rec) => {
    const coffeePrimary = primaryFacet === "coffee";
    const bakeryOnly =
      coffeePrimary &&
      rec._strategyIds.includes(FACET_STRATEGY_ID.bakery) &&
      !rec._strategyIds.includes(FACET_STRATEGY_ID.coffee);
    const multiBonus =
      rec._strategyIds.length > 1 && !(coffeePrimary && bakeryOnly && isFullServiceRestaurant(rec))
        ? 0.12
        : 0;
    const ambientBonus = opts.ambientBoosts
      ? listingMatchesAmbientBoost(rec, opts.ambientBoosts)
      : 0;
    const finalScore =
      baseScore(rec) * rec._strategyWeight +
      multiBonus +
      kidFriendlyBoost(rec, opts.wantKids) +
      treatsBoost(rec, opts.wantTreats, primaryFacet) +
      primaryFacetRankingAdjustments(rec, primaryFacet) +
      anchorTownRankingAdjustments(rec, opts.anchorTownName) +
      ambientBonus;
    return { rec, finalScore };
  });

  scored.sort((a, b) => b.finalScore - a.finalScore);
  const top = scored.slice(0, opts.limit);

  const recommendations = top.map(({ rec, finalScore }, i) => {
    const explanation = buildRankExplanation(rec);
    return {
      ...rec,
      rank: i + 1,
      explanation,
      headline: rec.business.name,
      _composite: finalScore,
    };
  });

  const strategySummary = opts.strategies.map((s) => s.label).join(", ");
  const payload: SearchResultPayload = {
    query: opts.primaryQuery,
    query_hash: opts.payloads[0]?.payload.query_hash ?? "",
    normalized_query: opts.payloads[0]?.payload.normalized_query ?? opts.primaryQuery,
    summary:
      recommendations.length > 0
        ? `Found ${recommendations.length} verified picks (${strategySummary}).`
        : `No verified listings matched after ${opts.strategies.length} search approaches.`,
    total_results: recommendations.length,
    recommendations,
    suggestions: [],
    cached: false,
    confidence: opts.payloads[0]?.payload.confidence,
    _retrieval: opts.payloads[0]?.payload._retrieval,
    _debug: opts.payloads[0]?.payload._debug,
    resolved_filters: opts.payloads[0]?.payload.resolved_filters,
  };

  const reviewNotes = top.map(({ rec, finalScore }, i) => ({
    rank: i + 1,
    business_id: rec.business_id,
    title: rec.business.name,
    score: Math.round(finalScore * 1000) / 1000,
    strategies: [...new Set(rec._strategyLabels)],
    why: buildRankExplanation(rec),
  }));

  return { payload, reviewNotes };
}
