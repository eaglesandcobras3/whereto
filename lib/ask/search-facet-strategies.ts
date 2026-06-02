/**
 * Declarative map: search facet → discovery strategy template.
 */

import type { SearchCandidateRankOrder } from "@/lib/scoring";
import type { DiscoveryStrategy } from "@/lib/ask/discovery-strategies";
import type { SearchFacetId } from "@/lib/ask/search-facets";

type StrategyTemplate = {
  id: string;
  label: string;
  categorySlug: string | null;
  matchHint: string;
  baseWeight: number;
  /** Boost when this facet was explicitly chosen (clarify chip / phrase). */
  explicitWeight: number;
  querySuffix?: string;
  sortMode?: SearchCandidateRankOrder;
  requiredIsServiceBusiness?: boolean;
};

const TEMPLATES: Record<SearchFacetId, StrategyTemplate> = {
  coffee: {
    id: "coffee_shops",
    label: "Coffee & cafes",
    categorySlug: "coffee_shops",
    matchHint: "coffee or café",
    baseWeight: 1,
    explicitWeight: 1,
  },
  bakery: {
    id: "bakery_restaurants",
    label: "Bakery & pastries",
    categorySlug: "restaurants",
    matchHint: "bakery goods and pastries",
    baseWeight: 0.93,
    explicitWeight: 0.98,
    querySuffix: "bakery pastries muffins",
  },
  ice_cream: {
    id: "dessert_sweets",
    label: "Ice cream & sweets",
    categorySlug: "restaurants",
    matchHint: "desserts, ice cream, or sweet treats",
    baseWeight: 0.88,
    explicitWeight: 0.98,
    querySuffix: "ice cream gelato sweet treats",
  },
  donut: {
    id: "bakery_restaurants",
    label: "Bakery & pastries",
    categorySlug: "restaurants",
    matchHint: "donuts and pastries",
    baseWeight: 0.93,
    explicitWeight: 0.98,
    querySuffix: "donut pastry",
  },
  dining: {
    id: "restaurants",
    label: "Restaurants",
    categorySlug: "restaurants",
    matchHint: "dining",
    baseWeight: 0.95,
    explicitWeight: 0.98,
  },
  bars: {
    id: "bars",
    label: "Bars & drinks",
    categorySlug: "bars",
    matchHint: "drinks",
    baseWeight: 0.95,
    explicitWeight: 0.98,
  },
  shopping: {
    id: "shopping",
    label: "Shopping",
    categorySlug: "shopping",
    matchHint: "shopping",
    baseWeight: 0.95,
    explicitWeight: 0.98,
  },
  activities: {
    id: "activities",
    label: "Activities",
    categorySlug: "activities",
    matchHint: "activities",
    baseWeight: 0.95,
    explicitWeight: 0.98,
  },
  services: {
    id: "services",
    label: "Services",
    categorySlug: "services",
    matchHint: "local service providers",
    baseWeight: 0.97,
    explicitWeight: 0.98,
    requiredIsServiceBusiness: true,
  },
};

const EXPLICIT_TREAT_FACET: Partial<Record<SearchFacetId, boolean>> = {
  bakery: true,
  ice_cream: true,
  donut: true,
};

export function buildStrategiesFromFacets(
  activeFacets: SearchFacetId[],
  opts: {
    effectiveQuery: string;
    vibeTags?: string[];
    wantsBest: boolean;
    explicitTreatFacet: SearchFacetId | null;
    primaryFacet?: SearchFacetId | null;
  },
): DiscoveryStrategy[] {
  const strategies: DiscoveryStrategy[] = [];
  const seenIds = new Set<string>();
  const coffeeIsPrimary =
    opts.primaryFacet === "coffee" ||
    (activeFacets.includes("coffee") && !opts.primaryFacet);

  for (const facet of activeFacets) {
    const template = TEMPLATES[facet];
    if (seenIds.has(template.id) && facet !== "donut") {
      continue;
    }
    seenIds.add(template.id);

    const isExplicit = opts.explicitTreatFacet === facet && EXPLICIT_TREAT_FACET[facet];
    const rawQuery = template.querySuffix
      ? `${opts.effectiveQuery} ${template.querySuffix}`.trim()
      : opts.effectiveQuery;

    // Treat-type clarify (bakery) is secondary when user asked for coffee first.
    let weight = isExplicit ? template.explicitWeight : template.baseWeight;
    if (coffeeIsPrimary && facet === "bakery" && isExplicit) {
      weight = 0.84;
    }

    strategies.push({
      id: facet === "donut" ? "bakery_donut" : template.id,
      label: template.label,
      rawQuery,
      categorySlug: template.categorySlug,
      vibeTags: opts.vibeTags,
      weight,
      matchHint: template.matchHint,
      sortMode: opts.wantsBest ? "relevance" : template.sortMode,
      requiredIsServiceBusiness: template.requiredIsServiceBusiness,
    });
  }

  return strategies;
}

export function explicitTreatFacet(
  explicitTreat: import("@/lib/ask/search-input").TreatPreference | null,
): SearchFacetId | null {
  if (!explicitTreat) return null;
  const map: Record<import("@/lib/ask/search-input").TreatPreference, SearchFacetId | null> = {
    bakery: "bakery",
    ice_cream: "ice_cream",
    donut: "donut",
    coffee_sweet: "coffee",
  };
  return map[explicitTreat] ?? null;
}
