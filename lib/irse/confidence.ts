import type { CategoryScores } from "./types";
import { CONFIDENCE_PEER_MIN } from "./weights";

/**
 * Confidence v1:
 * (a) data completeness of applicable checks (0–1)
 * (b) once ≥ CONFIDENCE_PEER_MIN indexed peers exist, proximity of this score
 *     vector to the indexed cohort centroid (cosine-like via L1 distance on 0–100 axes)
 *
 * Blend: 0.6 * completeness + 0.4 * peerSimilarity (or 1.0 * completeness when peers unavailable).
 */
export function computeConfidence(options: {
  dataCompleteness: number;
  scores: CategoryScores;
  indexedPeerCentroid?: CategoryScores | null;
  indexedPeerCount?: number;
}): number {
  const completeness = clamp01(options.dataCompleteness);
  const peerCount = options.indexedPeerCount ?? 0;
  const centroid = options.indexedPeerCentroid;

  if (!centroid || peerCount < CONFIDENCE_PEER_MIN) {
    return round2(completeness);
  }

  const similarity = scoreVectorSimilarity(options.scores, centroid);
  return round2(0.6 * completeness + 0.4 * similarity);
}

export function scoreVectorSimilarity(a: CategoryScores, b: CategoryScores): number {
  const keys: (keyof CategoryScores)[] = ["entity", "content", "seo", "discovery", "trust"];
  let sumAbs = 0;
  for (const k of keys) {
    sumAbs += Math.abs(a[k] - b[k]);
  }
  // Max L1 distance on five 0–100 axes is 500
  return clamp01(1 - sumAbs / 500);
}

export function centroidOf(scores: CategoryScores[]): CategoryScores | null {
  if (scores.length === 0) return null;
  const sum: CategoryScores = { entity: 0, content: 0, seo: 0, discovery: 0, trust: 0 };
  for (const s of scores) {
    sum.entity += s.entity;
    sum.content += s.content;
    sum.seo += s.seo;
    sum.discovery += s.discovery;
    sum.trust += s.trust;
  }
  const n = scores.length;
  return {
    entity: sum.entity / n,
    content: sum.content / n,
    seo: sum.seo / n,
    discovery: sum.discovery / n,
    trust: sum.trust / n,
  };
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
