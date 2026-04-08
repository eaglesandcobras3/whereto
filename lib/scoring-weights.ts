/**
 * Tunable composite ranking weights (Phase 3). Env overrides optional; defaults match prior hardcoded behavior.
 * Sum of primary five weights is ~1.0 before exploration + rating bump.
 */
function num(envKey: string, fallback: number): number {
  const v = process.env[envKey];
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : fallback;
}

export function getCompositeWeights() {
  return {
    relevance: num("SCORING_WEIGHT_RELEVANCE", 0.45),
    confidence: num("SCORING_WEIGHT_CONFIDENCE", 0.2),
    freshness: num("SCORING_WEIGHT_FRESHNESS", 0.15),
    engagement: num("SCORING_WEIGHT_ENGAGEMENT", 0.12),
    completeness: num("SCORING_WEIGHT_COMPLETENESS", 0.08),
    /** Scaled: (listing_rating / 5) * this */
    ratingTiebreak: num("SCORING_WEIGHT_RATING_TIEBREAK", 0.05),
  };
}
