/**
 * Build {@link SearchIntent} from resolved facets + constraints (no OpenAI).
 */

import { extractTownFromNormalizedQuery } from "@/lib/ai/search-ai";
import {
  primaryFacetFromActive,
  type SearchFacetId,
  type ResolvedSearchFacets,
} from "@/lib/ask/search-facets";
import type { TreatPreference } from "@/lib/ask/search-input";
import type { SearchIntent } from "@/lib/intent-schema";

const FACET_PRIMARY_CATEGORY: Record<SearchFacetId, string> = {
  coffee: "coffee_shops",
  bakery: "restaurants",
  ice_cream: "restaurants",
  donut: "restaurants",
  dining: "restaurants",
  bars: "bars",
  shopping: "shopping",
  activities: "activities",
  services: "services",
};

const TREAT_SPECIFIC_ITEMS: Record<TreatPreference, string[]> = {
  bakery: ["bakery", "pastries", "muffins", "cookies"],
  ice_cream: ["ice cream", "gelato", "frozen yogurt"],
  donut: ["donuts", "doughnuts", "pastries"],
  coffee_sweet: ["coffee", "sweet treats"],
};

function primaryCategoryFromFacets(
  active: SearchFacetId[],
  toolCategorySlug: string | null,
): string | null {
  if (toolCategorySlug) return toolCategorySlug;
  const best = primaryFacetFromActive(active);
  return best ? FACET_PRIMARY_CATEGORY[best] ?? null : null;
}

function queryTypeFromFacets(
  facets: ResolvedSearchFacets,
  normalized: string,
): "keyword" | "specific" | "vibe" {
  if (facets.constraints.vibeTags.length > 0 && facets.active.length <= 1) {
    if (/\b(romantic|waterfront|quiet|lively|cozy|upscale|casual)\b/i.test(normalized)) {
      return "vibe";
    }
  }
  if (facets.explicitTreat || facets.constraints.dietaryNeeds.length > 0) {
    return "specific";
  }
  return "keyword";
}

/** Deterministic intent when facet plan is complete enough to skip OpenAI parse. */
export function buildIntentFromFacets(
  facets: ResolvedSearchFacets,
  opts: {
    normalized: string;
    toolCategorySlug: string | null;
  },
): SearchIntent {
  const { constraints } = facets;
  const category = primaryCategoryFromFacets(facets.active, opts.toolCategorySlug);

  const specificItems: string[] = [];
  if (facets.explicitTreat) {
    specificItems.push(...TREAT_SPECIFIC_ITEMS[facets.explicitTreat]);
  }

  const attributes = [...constraints.vibeTags];
  if (constraints.vibeTags.includes("kid_friendly") && !attributes.includes("kid_friendly")) {
    attributes.push("kid_friendly");
  }

  const town =
    constraints.townOrArea ??
    extractTownFromNormalizedQuery(opts.normalized.toLowerCase());

  return {
    category,
    subcategory: null,
    location: {
      town,
      radius: constraints.locationRadius,
    },
    attributes,
    exclude_attributes: [],
    sort_preference: "quality",
    price_level: constraints.priceLevel,
    result_count: 10,
    specific_items: specificItems.length ? [...new Set(specificItems)] : [],
    dietary_needs: constraints.dietaryNeeds,
    meal_period: constraints.mealPeriod,
    atmosphere_needs: constraints.vibeTags.filter((t) =>
      /^(romantic|waterfront|outdoor_seating|quiet|lively|upscale|casual)$/.test(t),
    ),
    occasion: constraints.occasion,
    query_type: queryTypeFromFacets(facets, opts.normalized),
  };
}

/** Clarify/tool/session constraints override weaker LLM fields. */
export function mergeIntentWithFacetConstraints(
  intent: SearchIntent,
  facets: ResolvedSearchFacets,
): SearchIntent {
  const c = facets.constraints;
  const merged: SearchIntent = { ...intent };

  if (c.townOrArea) {
    merged.location = { town: c.townOrArea, radius: c.locationRadius };
  }

  if (c.mealPeriod) merged.meal_period = c.mealPeriod;
  if (c.dietaryNeeds.length) merged.dietary_needs = c.dietaryNeeds;
  if (c.priceLevel != null) merged.price_level = c.priceLevel;
  if (c.occasion) merged.occasion = c.occasion;

  const attr = new Set([...(intent.attributes ?? []), ...c.vibeTags]);
  merged.attributes = [...attr];

  const atmo = new Set([...(intent.atmosphere_needs ?? []), ...c.vibeTags]);
  merged.atmosphere_needs = [...atmo];

  if (!merged.category && facets.active.length > 0) {
    merged.category = primaryCategoryFromFacets(facets.active, null);
  }

  if (facets.explicitTreat && !(merged.specific_items?.length)) {
    merged.specific_items = TREAT_SPECIFIC_ITEMS[facets.explicitTreat];
    merged.query_type = "specific";
  }

  return merged;
}
