import type {
  CategoryCheckResult,
  CategoryScores,
  IrseFlag,
  ScoreBand,
  ScoreResult,
  PageKind,
} from "./types";
import { CATEGORY_WEIGHTS, INDEX_READY_THRESHOLD } from "./weights";

export function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function bandForScore(overallScore: number): ScoreBand {
  if (overallScore >= 95) return "exceptional";
  if (overallScore >= 90) return "featured_ready";
  if (overallScore >= 80) return "index_ready";
  if (overallScore >= 70) return "needs_improvement";
  if (overallScore >= 60) return "needs_significant_work";
  return "not_ready";
}

export function sumCheckContributions(
  contributions: Array<{ points: number; max: number; applicable: boolean }>,
): { score: number; dataCompleteness: number } {
  let earned = 0;
  let max = 0;
  let applicable = 0;
  let withData = 0;
  for (const c of contributions) {
    if (!c.applicable) continue;
    applicable += 1;
    max += c.max;
    earned += Math.max(0, Math.min(c.max, c.points));
    if (c.max > 0 && c.points > 0) withData += 1;
    else if (c.max > 0) {
      // applicable with data evaluated (including zero points for missing fields)
      withData += 1;
    }
  }
  if (max <= 0) return { score: 0, dataCompleteness: 0 };
  return {
    score: clampScore((earned / max) * 100),
    dataCompleteness: applicable > 0 ? withData / applicable : 0,
  };
}

export function mergeCategoryResults(parts: {
  entity: CategoryCheckResult;
  content: CategoryCheckResult;
  seo: CategoryCheckResult;
  discovery: CategoryCheckResult;
  trust: CategoryCheckResult;
}): {
  scores: CategoryScores;
  overallScore: number;
  flags: IrseFlag[];
  recommendations: string[];
  meanCompleteness: number;
} {
  const scores: CategoryScores = {
    entity: clampScore(parts.entity.score),
    content: clampScore(parts.content.score),
    seo: clampScore(parts.seo.score),
    discovery: clampScore(parts.discovery.score),
    trust: clampScore(parts.trust.score),
  };

  const overall =
    scores.entity * CATEGORY_WEIGHTS.entity +
    scores.content * CATEGORY_WEIGHTS.content +
    scores.seo * CATEGORY_WEIGHTS.seo +
    scores.discovery * CATEGORY_WEIGHTS.discovery +
    scores.trust * CATEGORY_WEIGHTS.trust;

  const flags = [
    ...parts.entity.flags,
    ...parts.content.flags,
    ...parts.seo.flags,
    ...parts.discovery.flags,
    ...parts.trust.flags,
  ].sort((a, b) => severityRank(a.severity) - severityRank(b.severity));

  const recommendations = uniqueStrings([
    ...parts.entity.recommendations,
    ...parts.content.recommendations,
    ...parts.seo.recommendations,
    ...parts.discovery.recommendations,
    ...parts.trust.recommendations,
  ]).slice(0, 12);

  const meanCompleteness =
    (parts.entity.dataCompleteness +
      parts.content.dataCompleteness +
      parts.seo.dataCompleteness +
      parts.discovery.dataCompleteness +
      parts.trust.dataCompleteness) /
    5;

  return {
    scores,
    overallScore: clampScore(overall),
    flags,
    recommendations,
    meanCompleteness,
  };
}

function severityRank(s: IrseFlag["severity"]): number {
  if (s === "critical") return 0;
  if (s === "warning") return 1;
  return 2;
}

function uniqueStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const t = item.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

export function buildScoreResult(input: {
  kind: PageKind;
  slug: string;
  path: string;
  scores: CategoryScores;
  overallScore: number;
  flags: IrseFlag[];
  recommendations: string[];
  confidence: number;
}): ScoreResult {
  const overallScore = clampScore(input.overallScore);
  return {
    kind: input.kind,
    slug: input.slug,
    path: input.path,
    overallScore,
    indexReady: overallScore >= INDEX_READY_THRESHOLD,
    band: bandForScore(overallScore),
    confidence: Math.max(0, Math.min(1, input.confidence)),
    scores: {
      entity: clampScore(input.scores.entity),
      content: clampScore(input.scores.content),
      seo: clampScore(input.scores.seo),
      discovery: clampScore(input.scores.discovery),
      trust: clampScore(input.scores.trust),
    },
    flags: input.flags,
    recommendations: input.recommendations,
  };
}
