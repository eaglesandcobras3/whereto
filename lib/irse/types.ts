/** Page kinds scored by the Index Readiness Scoring Engine. */
export type PageKind = "business" | "guide" | "town" | "area" | "category";

export type FlagSeverity = "critical" | "warning" | "info";

export type IrseFlag = {
  severity: FlagSeverity;
  code: string;
  message: string;
};

export type CategoryScores = {
  entity: number;
  content: number;
  seo: number;
  discovery: number;
  trust: number;
};

export type ScoreBand =
  | "exceptional"
  | "featured_ready"
  | "index_ready"
  | "needs_improvement"
  | "needs_significant_work"
  | "not_ready";

export type GscStatus = {
  indexed: boolean | null;
  coverageState?: string;
  inspectedAt?: string;
};

export type ScoreResult = {
  kind: PageKind;
  slug: string;
  path: string;
  overallScore: number;
  indexReady: boolean;
  band: ScoreBand;
  confidence: number;
  scores: CategoryScores;
  flags: IrseFlag[];
  recommendations: string[];
  gsc?: GscStatus;
};

/** Result of one category's checks before weighted rollup. */
export type CategoryCheckResult = {
  score: number;
  flags: IrseFlag[];
  recommendations: string[];
  /** Fraction of applicable sub-checks that had data (0–1). */
  dataCompleteness: number;
};

export type CheckContribution = {
  /** Points awarded (0–max). */
  points: number;
  max: number;
  /** False when the check could not be evaluated (no data model / N/A). */
  applicable: boolean;
  flag?: IrseFlag;
  recommendation?: string;
};

export const PAGE_KINDS: PageKind[] = ["business", "guide", "town", "area", "category"];

export function isPageKind(value: string): value is PageKind {
  return (PAGE_KINDS as string[]).includes(value);
}
