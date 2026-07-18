import type { CategoryScores } from "./types";

/** PRD category weights (must sum to 1). Tunable after calibration. */
export const CATEGORY_WEIGHTS: CategoryScores = {
  entity: 0.25,
  content: 0.25,
  seo: 0.2,
  discovery: 0.15,
  trust: 0.15,
};

/** Minimum overall score for IRSE `indexReady` (PRD: Index Ready band). */
export const INDEX_READY_THRESHOLD = 80;

/** Calibration: indexed mean − non-indexed mean should meet this floor. */
export const CALIBRATION_SEPARATION_FLOOR = 15;

/** GSC inspection cache TTL (ms). */
export const GSC_INSPECTION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Peers needed before cohort-similarity contributes to confidence. */
export const CONFIDENCE_PEER_MIN = 20;

/**
 * Generic AI / filler phrases that reduce content uniqueness.
 * Tunable list — not exhaustive.
 */
export const GENERIC_AI_PHRASES = [
  "nestled in the heart",
  "hidden gem",
  "something for everyone",
  "whether you're looking for",
  "look no further",
  "in today's fast-paced",
  "a must-visit destination",
  "breathtaking views await",
  "tapestry of",
  "delve into",
  "it's important to note",
  "in conclusion",
] as const;
