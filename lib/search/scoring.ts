/**
 * Canonical composite scoring — single source of truth shared by production retrieval
 * (recommendation-set-minimal.ts) and the eval runner (local/eval-search.ts).
 *
 * Changing weights, patterns, or formulas here propagates to both automatically.
 * No more silent drift between what eval measures and what production does.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ScoringIntent = {
  category?: string | null;
  specificItems?: string[];
  dietaryNeeds?: string[];
  mealPeriod?: string | null;
  atmosphereNeeds?: string[];
  occasion?: string | null;
};

export type ScoreBreakdown = {
  composite: number;
  structured_match: number;
  vec_similarity: number;
  quality: number;
  data_quality: number;
  learning_boost: number;
  geo_score: number;
};

// ---------------------------------------------------------------------------
// Configurable weights
// ---------------------------------------------------------------------------

export type RankingWeights = {
  /** Structured facet match weight when signal is present. */
  structuredMatch: number;
  /** Vector similarity weight when structured signal exists. */
  vecSimWithSignal: number;
  /** Vector similarity weight when NO structured signal (simple keyword). */
  vecSimNoSignal: number;
  /** Listing quality weight (rating, reviews, featured). */
  quality: number;
  /** Data completeness weight (tag coverage, embedding, etc.). */
  dataQuality: number;
  /** Geo proximity weight when user lat/lng is available. */
  geoScore: number;
};

/**
 * Weights approximate the previous implicit formula while adding data_quality + geo.
 *
 * With signal, no geo: structured(0.55) + vec(0.25) + quality(0.12) + dataQuality(0.08) = 1.00
 * Without signal, no geo: vec(0.85) + quality(0.10) + dataQuality(0.05) = 1.00
 * Geo steals 8% proportionally from other components when user location is available.
 */
export const RANKING_WEIGHTS: RankingWeights = {
  structuredMatch: 0.55,
  vecSimWithSignal: 0.25,
  vecSimNoSignal: 0.85,
  quality: 0.12,
  dataQuality: 0.08,
  geoScore: 0.08,
};

// ---------------------------------------------------------------------------
// Tag-matching utilities (canonical — also used by hybrid-vector-postprocess.ts)
// ---------------------------------------------------------------------------

export function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export function variantsForFoodItemPhrase(item: string): string[] {
  const raw = stripDiacritics(item.toLowerCase().trim());
  const out = new Set<string>([raw]);
  const addPhrase = (...phrases: string[]) => phrases.forEach((p) => out.add(p));

  if (/\bhamburgers?\b|\bburgers?\b|\bcheeseburgers?\b/.test(raw)) {
    addPhrase("hamburger", "hamburgers", "burger", "burgers", "cheeseburger", "cheeseburgers");
  }
  if (/\bsandwich(es)?\b|\bsubs?\b|\bpo[\s]?boy(s)?\b/i.test(raw)) {
    addPhrase("sandwich", "sandwiches", "sub", "subs", "po boy", "po-boy");
  }
  if (/\bdonuts?\b|\bdoughnuts?\b/.test(raw)) {
    addPhrase("donut", "donuts", "doughnut", "doughnuts");
  }

  return [...out];
}

export function itemMatchesTaggedRow(intentItem: string, rowTagsLower: string[]): boolean {
  const tagsNorm = rowTagsLower.map(stripDiacritics);
  for (const v of variantsForFoodItemPhrase(intentItem)) {
    if (
      tagsNorm.some(
        (t) => v.length >= 3 && (t.includes(v) || v.includes(t) || t.includes(v.replace(/\s+/g, ""))),
      )
    )
      return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Category type patterns
// ---------------------------------------------------------------------------

/**
 * Maps category slug → regex matching common business_type values.
 * Word-level fallback used when no pattern exists for the category.
 * Kept here to prevent category matching drift between eval and production.
 */
export const CATEGORY_TYPE_PATTERNS: Record<string, RegExp> = {
  restaurants:
    /restaurant|coffee|cafe|café|diner|bistro|grill|eatery|food.?truck|food.?stand|taqueria|pizzeria|taco|hot.?dog|ice.?cream|dessert|bakery|donut|doughnut|smoothie|juice.?bar|kitchen|brasserie|steakhouse|seafood|sushi|bar$|pub$|bbq|barbecue|creperie|ramen|poke|sandwich/i,
  coffee_shops:
    /coffee|cafe|café|espresso|coffeehouse|coffee.?house|tea|latte|cappuccino|barista|roaster|brew/i,
  bars:
    /bar|pub|tavern|brewery|brewpub|winery|lounge|cocktail|nightclub|dive.?bar|sports.?bar|taproom/i,
  activities:
    /activit|rental|tour|fitness|gym|studio|sport|outdoor|water.?sport|bike|paddl|surf|yoga|pilates|marina|charter|excursion|kayak|snorkel|dive|golf|tennis|pickleball/i,
  shopping:
    /boutique|shop|store|retail|gallery|clothing|apparel|fashion|gift|jewelry|jewellery|market|souvenir|consignment|thrift/i,
  services:
    /salon|spa|wellness|beauty|medical|dental|repair|service|contractor|studio|therapy|massage|realtor|insurance|legal/i,
};

// ---------------------------------------------------------------------------
// Individual scorers
// ---------------------------------------------------------------------------

export function computeStructuredMatch(
  row: Record<string, unknown>,
  intent: ScoringIntent,
): { score: number; hasSignal: boolean } {
  const components: { weight: number; score: number }[] = [];

  if (intent.category) {
    const businessType = String(row.business_type ?? "").trim().toLowerCase();
    if (businessType) {
      const catNorm = intent.category.replace(/_/g, " ").toLowerCase();
      const catKey = intent.category.toLowerCase();
      const categoryPattern = CATEGORY_TYPE_PATTERNS[catKey];
      const wordMatch =
        !categoryPattern &&
        catNorm.split(" ").some((w) => {
          if (w.length <= 3) return false;
          const stem = w.replace(/s$/, "");
          return businessType.includes(w) || businessType.includes(stem);
        });
      const matchScore = (categoryPattern ? categoryPattern.test(businessType) : wordMatch) ? 1.0 : 0.0;
      components.push({ weight: 40, score: matchScore });
    }
  }

  if (intent.specificItems?.length) {
    const rowItemsRaw = ((row.item_tags as string[] | null) ?? []).map((t) => String(t).trim());
    const rowItems = rowItemsRaw.map((t) => t.toLowerCase());
    const hasTypedMenu = rowItemsRaw.some((t) => t.length > 0);
    if (hasTypedMenu) {
      const matched = intent.specificItems.filter((item) => itemMatchesTaggedRow(item, rowItems)).length;
      components.push({ weight: 35, score: matched / intent.specificItems.length });
    }
  }

  if (intent.dietaryNeeds?.length) {
    const rowDietary = (row.dietary_tags as string[] | null) ?? [];
    const matched = intent.dietaryNeeds.filter((d) => rowDietary.includes(d)).length;
    components.push({ weight: 15, score: matched / intent.dietaryNeeds.length });
  }

  if (intent.mealPeriod) {
    const rowMeal = (row.meal_period_tags as string[] | null) ?? [];
    components.push({ weight: 5, score: rowMeal.includes(intent.mealPeriod) ? 1.0 : 0.0 });
  }

  if (intent.atmosphereNeeds?.length || intent.occasion) {
    const rowAtm = (row.atmosphere_tags as string[] | null) ?? [];
    const rowOcc = (row.occasion_tags as string[] | null) ?? [];
    const rowAll = [...rowAtm, ...rowOcc].map((t) => t.toLowerCase());
    const needed = [
      ...(intent.atmosphereNeeds ?? []),
      ...(intent.occasion ? [intent.occasion] : []),
    ];
    const matched = needed.filter((n) => rowAll.some((r) => r.includes(n.toLowerCase()))).length;
    components.push({ weight: 5, score: matched / needed.length });
  }

  if (components.length === 0) return { score: 0, hasSignal: false };
  const totalWeight = components.reduce((s, c) => s + c.weight, 0);
  const weightedScore = components.reduce((s, c) => s + c.weight * c.score, 0);
  return { score: weightedScore / totalWeight, hasSignal: true };
}

export function computeQuality(row: Record<string, unknown>): number {
  const featured = (row.featured as boolean | null) ? 1.0 : 0.0;
  const rating = Math.min(1.0, ((row.review_rating_cached as number | null) ?? 0) / 5.0);
  const reviews = Math.min(1.0, ((row.review_count_cached as number | null) ?? 0) / 50);
  return featured * 0.5 + rating * 0.3 + reviews * 0.2;
}

export function computeGeoScore(distanceKm: number | null | undefined): number {
  if (distanceKm == null) return 0;
  if (distanceKm < 0.5) return 1.0;
  if (distanceKm < 2) return 0.8;
  if (distanceKm < 5) return 0.6;
  if (distanceKm < 15) return 0.4;
  return 0.2;
}

// ---------------------------------------------------------------------------
// Composite scorer — returns full breakdown, applies learning boost
// ---------------------------------------------------------------------------

export function computeCompositeWithBreakdown(
  row: Record<string, unknown>,
  intent: ScoringIntent,
  vecSim: number,
  learningBoost = 0,
  weights: RankingWeights = RANKING_WEIGHTS,
): ScoreBreakdown {
  const quality = computeQuality(row);
  const dataQuality =
    typeof row.data_quality_score === "number" ? (row.data_quality_score as number) : 0.5;
  const geoDistanceKm = row.geo_distance_km != null ? Number(row.geo_distance_km) : null;
  const geoScore = computeGeoScore(geoDistanceKm);
  const hasGeo = geoDistanceKm != null;
  const { score: structuredScore, hasSignal } = computeStructuredMatch(row, intent);

  let composite: number;

  if (hasSignal) {
    if (hasGeo) {
      const base = 1 - weights.geoScore;
      composite =
        structuredScore * (weights.structuredMatch * base) +
        vecSim * (weights.vecSimWithSignal * base) +
        quality * (weights.quality * base) +
        dataQuality * (weights.dataQuality * base) +
        geoScore * weights.geoScore;
    } else {
      const total = weights.structuredMatch + weights.vecSimWithSignal + weights.quality + weights.dataQuality;
      composite =
        structuredScore * (weights.structuredMatch / total) +
        vecSim * (weights.vecSimWithSignal / total) +
        quality * (weights.quality / total) +
        dataQuality * (weights.dataQuality / total);
    }
  } else {
    const noSigQuality = weights.quality;
    const noSigData = 1 - weights.vecSimNoSignal - noSigQuality;
    if (hasGeo) {
      const base = 1 - weights.geoScore;
      composite =
        vecSim * (weights.vecSimNoSignal * base) +
        quality * (noSigQuality * base) +
        dataQuality * (noSigData * base) +
        geoScore * weights.geoScore;
    } else {
      composite = vecSim * weights.vecSimNoSignal + quality * noSigQuality + dataQuality * noSigData;
    }
  }

  composite = Math.min(1, composite + learningBoost);

  return {
    composite,
    structured_match: structuredScore,
    vec_similarity: vecSim,
    quality,
    data_quality: dataQuality,
    learning_boost: learningBoost,
    geo_score: geoScore,
  };
}

/** Convenience wrapper when only the final composite is needed. */
export function computeComposite(
  row: Record<string, unknown>,
  intent: ScoringIntent,
  vecSim: number,
  learningBoost = 0,
  weights: RankingWeights = RANKING_WEIGHTS,
): number {
  return computeCompositeWithBreakdown(row, intent, vecSim, learningBoost, weights).composite;
}
