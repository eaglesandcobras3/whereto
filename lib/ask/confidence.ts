import type { SearchResultPayload } from "@/lib/search/types";

export const CONFIDENCE_HIGH = 0.75;
export const CONFIDENCE_LOW = 0.45;

export type ConfidenceInput = {
  resultCount: number;
  topComposite?: number;
  topVec?: number;
  retrievalPath?: string;
  hasTownFilter?: boolean;
  hasCategoryFilter?: boolean;
};

/** Aggregate confidence 0–1 from retrieval quality and result count. */
export function computeConfidenceScore(input: ConfidenceInput): number {
  const { resultCount, topComposite, topVec, retrievalPath } = input;

  if (resultCount === 0) return 0.1;

  let score = 0.35;

  if (resultCount >= 3) score += 0.15;
  if (resultCount >= 6) score += 0.1;

  const vec = topVec ?? topComposite ?? 0;
  if (vec >= 0.75) score += 0.25;
  else if (vec >= 0.55) score += 0.15;
  else if (vec >= 0.4) score += 0.08;

  if (topComposite != null && topComposite >= 0.5) score += 0.1;

  if (retrievalPath === "hybrid_strict" || retrievalPath === "hybrid_relaxed") {
    score += 0.08;
  } else if (retrievalPath === "ilike") {
    score -= 0.05;
  }

  if (input.hasTownFilter) score += 0.05;
  if (input.hasCategoryFilter) score += 0.05;

  return Math.min(1, Math.max(0, score));
}

export function confidenceFromSearchPayload(
  payload: SearchResultPayload,
): number {
  const top = payload.recommendations[0];
  return computeConfidenceScore({
    resultCount: payload.recommendations.length,
    topComposite: top?._composite,
    topVec: top?._vec_similarity,
    retrievalPath: payload._retrieval?.path ?? payload._debug?.retrieval?.path,
    hasTownFilter: Boolean(payload.resolved_filters?.town_ids?.length),
    hasCategoryFilter: Boolean(payload.resolved_filters?.category_slugs?.length),
  });
}

export function handoffRequired(score: number): boolean {
  return score < CONFIDENCE_LOW;
}

export function followUpSuggested(score: number): boolean {
  return score >= CONFIDENCE_LOW && score < CONFIDENCE_HIGH;
}
