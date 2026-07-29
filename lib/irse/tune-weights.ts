import type { CategoryScores, PageKind } from "./types";
import { CATEGORY_WEIGHTS, CALIBRATION_SEPARATION_FLOOR } from "./weights";
import { clampScore } from "./aggregate";

export type WeightTuneRow = {
  indexed: boolean;
  scores: CategoryScores;
  kind?: PageKind;
};

/** Kinds used for weight search by default (excludes thin category hubs). */
export const DEFAULT_TUNE_KINDS: PageKind[] = [
  "business",
  "guide",
  "town",
  "area",
];

/** Floor / cap per category after normalize — blocks collapse onto one signal. */
export const TUNE_WEIGHT_MIN = 0.08;
export const TUNE_WEIGHT_MAX = 0.4;

/**
 * Penalty scale for ||w − baseline||² in the objective.
 * Higher → stay closer to PRD-balanced weights.
 */
export const TUNE_BASELINE_REGULARIZATION = 25;

export type WeightTuneResult = {
  baselineWeights: CategoryScores;
  bestWeights: CategoryScores;
  baselineSeparation: number | null;
  bestSeparation: number | null;
  baselineIndexedMean: number | null;
  baselineNotIndexedMean: number | null;
  bestIndexedMean: number | null;
  bestNotIndexedMean: number | null;
  /** Separation on the full labeled set with baseline / best weights (validation). */
  fullSetBaselineSeparation: number | null;
  fullSetBestSeparation: number | null;
  tuneKinds: PageKind[];
  tuneRowCount: number;
  tuneIndexedCount: number;
  tuneNotIndexedCount: number;
  improved: boolean;
  /** True when tune-set improves and full-set separation does not regress materially. */
  recommendApply: boolean;
  meetsFloor: boolean;
  separationFloor: number;
  weightMin: number;
  weightMax: number;
  notes: string[];
};

function mean(nums: number[]): number | null {
  if (!nums.length) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Overall score from category scores + explicit weights (weights need not be normalized). */
export function overallWithWeights(
  scores: CategoryScores,
  weights: CategoryScores,
): number {
  const sum =
    weights.entity +
    weights.content +
    weights.seo +
    weights.discovery +
    weights.trust;
  if (sum <= 0) return 0;
  const w = {
    entity: weights.entity / sum,
    content: weights.content / sum,
    seo: weights.seo / sum,
    discovery: weights.discovery / sum,
    trust: weights.trust / sum,
  };
  return clampScore(
    scores.entity * w.entity +
      scores.content * w.content +
      scores.seo * w.seo +
      scores.discovery * w.discovery +
      scores.trust * w.trust,
  );
}

export function separationForWeights(
  rows: WeightTuneRow[],
  weights: CategoryScores,
): {
  separation: number | null;
  indexedMean: number | null;
  notIndexedMean: number | null;
} {
  const indexed = rows
    .filter((r) => r.indexed)
    .map((r) => overallWithWeights(r.scores, weights));
  const notIndexed = rows
    .filter((r) => !r.indexed)
    .map((r) => overallWithWeights(r.scores, weights));
  const indexedMean = mean(indexed);
  const notIndexedMean = mean(notIndexed);
  const separation =
    indexedMean != null && notIndexedMean != null
      ? round1(indexedMean - notIndexedMean)
      : null;
  return { separation, indexedMean, notIndexedMean };
}

function normalizeWeights(w: CategoryScores): CategoryScores {
  const sum = w.entity + w.content + w.seo + w.discovery + w.trust;
  if (sum <= 0) return { ...CATEGORY_WEIGHTS };
  return {
    entity: w.entity / sum,
    content: w.content / sum,
    seo: w.seo / sum,
    discovery: w.discovery / sum,
    trust: w.trust / sum,
  };
}

const WEIGHT_KEYS: (keyof CategoryScores)[] = [
  "entity",
  "content",
  "seo",
  "discovery",
  "trust",
];

/** Project onto min/max box then re-normalize (iterated). */
export function constrainWeights(
  w: CategoryScores,
  min = TUNE_WEIGHT_MIN,
  max = TUNE_WEIGHT_MAX,
): CategoryScores {
  let cur = normalizeWeights(w);
  for (let iter = 0; iter < 24; iter++) {
    const clipped: CategoryScores = {
      entity: Math.min(max, Math.max(min, cur.entity)),
      content: Math.min(max, Math.max(min, cur.content)),
      seo: Math.min(max, Math.max(min, cur.seo)),
      discovery: Math.min(max, Math.max(min, cur.discovery)),
      trust: Math.min(max, Math.max(min, cur.trust)),
    };
    const sum = WEIGHT_KEYS.reduce((s, k) => s + clipped[k], 0);
    if (Math.abs(sum - 1) < 1e-9) {
      cur = clipped;
      break;
    }
    // Adjust only free (not-at-bound) weights toward sum=1
    const free = WEIGHT_KEYS.filter((k) => {
      const v = clipped[k];
      if (sum > 1) return v > min + 1e-12;
      return v < max - 1e-12;
    });
    if (!free.length) {
      cur = normalizeWeights(clipped);
      break;
    }
    const freeSum = free.reduce((s, k) => s + clipped[k], 0);
    const targetFree = 1 - WEIGHT_KEYS.filter((k) => !free.includes(k)).reduce(
      (s, k) => s + clipped[k],
      0,
    );
    const next = { ...clipped };
    if (freeSum <= 0) {
      const even = targetFree / free.length;
      for (const k of free) next[k] = Math.min(max, Math.max(min, even));
    } else {
      const scale = targetFree / freeSum;
      for (const k of free) {
        next[k] = Math.min(max, Math.max(min, clipped[k] * scale));
      }
    }
    const drift = WEIGHT_KEYS.reduce((s, k) => s + Math.abs(next[k] - cur[k]), 0);
    cur = next;
    if (drift < 1e-9) break;
  }
  const sum = WEIGHT_KEYS.reduce((s, k) => s + cur[k], 0);
  if (Math.abs(sum - 1) > 1e-6) {
    // Last resort: even split of residual onto under-cap keys
    let residual = 1 - sum;
    for (const k of WEIGHT_KEYS) {
      if (Math.abs(residual) < 1e-9) break;
      if (residual > 0) {
        const room = max - cur[k];
        const add = Math.min(room, residual);
        cur[k] += add;
        residual -= add;
      } else {
        const room = cur[k] - min;
        const sub = Math.min(room, -residual);
        cur[k] -= sub;
        residual += sub;
      }
    }
  }
  return cur;
}

function weightDistanceSq(a: CategoryScores, b: CategoryScores): number {
  return WEIGHT_KEYS.reduce((s, k) => s + (a[k] - b[k]) ** 2, 0);
}

function objective(
  separation: number | null,
  weights: CategoryScores,
  baseline: CategoryScores,
  regularization: number,
): number {
  if (separation == null) return Number.NEGATIVE_INFINITY;
  return separation - regularization * weightDistanceSq(weights, baseline);
}

/** Sample a random weight vector on the constrained simplex. */
function randomWeights(
  rng: () => number,
  min: number,
  max: number,
): CategoryScores {
  const raw = {
    entity: -Math.log(Math.max(rng(), 1e-12)),
    content: -Math.log(Math.max(rng(), 1e-12)),
    seo: -Math.log(Math.max(rng(), 1e-12)),
    discovery: -Math.log(Math.max(rng(), 1e-12)),
    trust: -Math.log(Math.max(rng(), 1e-12)),
  };
  return constrainWeights(normalizeWeights(raw), min, max);
}

function nudgeWeights(
  base: CategoryScores,
  rng: () => number,
  scale: number,
  min: number,
  max: number,
): CategoryScores {
  const next = { ...base };
  for (const k of WEIGHT_KEYS) {
    next[k] = base[k] + (rng() - 0.5) * scale;
  }
  return constrainWeights(next, min, max);
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function filterRowsForTune(
  rows: WeightTuneRow[],
  kinds: PageKind[],
): WeightTuneRow[] {
  const allow = new Set(kinds);
  return rows.filter((r) => r.kind != null && allow.has(r.kind));
}

export type TuneCategoryWeightsOptions = {
  samples?: number;
  seed?: number;
  /** Defaults to business/guide/town/area (excludes category hubs). */
  kinds?: PageKind[];
  weightMin?: number;
  weightMax?: number;
  baselineRegularization?: number;
  /** Max allowed drop in full-set separation vs baseline when recommending apply. */
  maxFullSetRegression?: number;
};

/**
 * Search category weight mixes to improve indexed − not-indexed separation.
 *
 * Stronger eval defaults:
 * - Tune on entity kinds only (not thin category hubs)
 * - Constrain each weight to [min, max]
 * - Regularize toward current CATEGORY_WEIGHTS
 * - Validate that full-set separation does not regress before recommending apply
 */
export function tuneCategoryWeights(
  rows: WeightTuneRow[],
  options?: TuneCategoryWeightsOptions,
): WeightTuneResult {
  const samples = options?.samples ?? 3000;
  const rng = mulberry32(options?.seed ?? 42);
  const kinds = options?.kinds?.length ? options.kinds : [...DEFAULT_TUNE_KINDS];
  const weightMin = options?.weightMin ?? TUNE_WEIGHT_MIN;
  const weightMax = options?.weightMax ?? TUNE_WEIGHT_MAX;
  const regularization =
    options?.baselineRegularization ?? TUNE_BASELINE_REGULARIZATION;
  const maxFullSetRegression = options?.maxFullSetRegression ?? 2;
  const notes: string[] = [];

  const baselineWeights = constrainWeights(
    { ...CATEGORY_WEIGHTS },
    weightMin,
    weightMax,
  );
  // If PRD weights already violate box, still use raw PRD as baseline for distance
  const baselineForDistance = { ...CATEGORY_WEIGHTS };

  const tuneRows = filterRowsForTune(rows, kinds);
  const useRows = tuneRows.length >= 6 ? tuneRows : rows;
  if (tuneRows.length < 6) {
    notes.push(
      `Tune set too small for kinds [${kinds.join(", ")}] (${tuneRows.length} rows); using full labeled set.`,
    );
  } else {
    notes.push(
      `Tuning on kinds [${kinds.join(", ")}] only (${tuneRows.length}/${rows.length} rows).`,
    );
  }
  notes.push(
    `Weight box [${weightMin}, ${weightMax}] per category; baseline regularization=${regularization}.`,
  );

  const baseline = separationForWeights(useRows, baselineForDistance);
  const fullSetBaseline = separationForWeights(rows, baselineForDistance);

  let bestWeights = constrainWeights(baselineForDistance, weightMin, weightMax);
  let bestSep = separationForWeights(useRows, bestWeights);
  let bestObj = objective(
    bestSep.separation,
    bestWeights,
    baselineForDistance,
    regularization,
  );

  for (let i = 0; i < samples; i++) {
    const candidate = randomWeights(rng, weightMin, weightMax);
    const result = separationForWeights(useRows, candidate);
    const obj = objective(
      result.separation,
      candidate,
      baselineForDistance,
      regularization,
    );
    if (obj > bestObj) {
      bestObj = obj;
      bestSep = result;
      bestWeights = candidate;
    }
  }

  for (let i = 0; i < 500; i++) {
    const candidate = nudgeWeights(
      bestWeights,
      rng,
      i < 250 ? 0.12 : 0.04,
      weightMin,
      weightMax,
    );
    const result = separationForWeights(useRows, candidate);
    const obj = objective(
      result.separation,
      candidate,
      baselineForDistance,
      regularization,
    );
    if (obj > bestObj) {
      bestObj = obj;
      bestSep = result;
      bestWeights = candidate;
    }
  }

  bestWeights = roundWeights(constrainWeights(bestWeights, weightMin, weightMax));
  bestSep = separationForWeights(useRows, bestWeights);
  const fullSetBest = separationForWeights(rows, bestWeights);

  const improved =
    bestSep.separation != null &&
    (baseline.separation == null ||
      bestSep.separation > baseline.separation + 0.5);

  const fullOk =
    fullSetBest.separation == null ||
    fullSetBaseline.separation == null ||
    fullSetBest.separation >= fullSetBaseline.separation - maxFullSetRegression;

  if (!fullOk) {
    notes.push(
      `Full-set separation regressed more than ${maxFullSetRegression} pts — not recommending apply.`,
    );
  }

  const recommendApply = improved && fullOk;

  return {
    baselineWeights: roundWeights(baselineForDistance),
    bestWeights,
    baselineSeparation: baseline.separation,
    bestSeparation: bestSep.separation,
    baselineIndexedMean: baseline.indexedMean,
    baselineNotIndexedMean: baseline.notIndexedMean,
    bestIndexedMean: bestSep.indexedMean,
    bestNotIndexedMean: bestSep.notIndexedMean,
    fullSetBaselineSeparation: fullSetBaseline.separation,
    fullSetBestSeparation: fullSetBest.separation,
    tuneKinds: kinds,
    tuneRowCount: useRows.length,
    tuneIndexedCount: useRows.filter((r) => r.indexed).length,
    tuneNotIndexedCount: useRows.filter((r) => !r.indexed).length,
    improved,
    recommendApply,
    meetsFloor:
      bestSep.separation != null &&
      bestSep.separation >= CALIBRATION_SEPARATION_FLOOR,
    separationFloor: CALIBRATION_SEPARATION_FLOOR,
    weightMin,
    weightMax,
    notes,
  };
}

function roundWeights(w: CategoryScores): CategoryScores {
  const rounded = {
    entity: Math.round(w.entity * 1000) / 1000,
    content: Math.round(w.content * 1000) / 1000,
    seo: Math.round(w.seo * 1000) / 1000,
    discovery: Math.round(w.discovery * 1000) / 1000,
    trust: Math.round(w.trust * 1000) / 1000,
  };
  return normalizeWeights(rounded);
}

export function formatWeightsTsBlock(weights: CategoryScores): string {
  const w = roundWeights(weights);
  return `export const CATEGORY_WEIGHTS: CategoryScores = {
  entity: ${w.entity},
  content: ${w.content},
  seo: ${w.seo},
  discovery: ${w.discovery},
  trust: ${w.trust},
};`;
}
