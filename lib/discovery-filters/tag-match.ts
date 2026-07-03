export type TagMatchAnalysis = {
  matched_required: string[];
  missing_required: string[];
  matched_any: string[];
  missing_any: string[];
  /** All required present on the listing. */
  strict_match: boolean;
  /** At least one required or optional tag present (when any tags are in play). */
  relaxed_match: boolean;
  /** Higher = better fit when sorting partial results. */
  score: number;
};

const REQUIRED_WEIGHT = 100;
const ANY_WEIGHT = 10;
const STRICT_BONUS = 1000;

export function analyzeTagMatch(
  searchTags: string[] | null | undefined,
  required: string[],
  anyTags: string[],
): TagMatchAnalysis {
  const present = new Set(
    (searchTags ?? []).filter((t) => typeof t === "string" && t.trim().length > 0),
  );

  const matched_required = required.filter((t) => present.has(t));
  const missing_required = required.filter((t) => !present.has(t));
  const matched_any = anyTags.filter((t) => present.has(t));
  const missing_any = anyTags.filter((t) => !present.has(t));

  const hasRequired = required.length > 0;
  const hasAny = anyTags.length > 0;

  let strict_match: boolean;
  if (hasRequired) {
    strict_match = matched_required.length === required.length;
  } else if (hasAny) {
    strict_match = matched_any.length > 0;
  } else {
    strict_match = true;
  }

  const desired = [...new Set([...required, ...anyTags])];
  const relaxed_match =
    desired.length === 0 ? true : desired.some((t) => present.has(t));

  const score =
    matched_required.length * REQUIRED_WEIGHT +
    matched_any.length * ANY_WEIGHT +
    (strict_match ? STRICT_BONUS : 0);

  return {
    matched_required,
    missing_required,
    matched_any,
    missing_any,
    strict_match,
    relaxed_match,
    score,
  };
}

export function compareTagMatchScore(a: TagMatchAnalysis, b: TagMatchAnalysis): number {
  return b.score - a.score;
}
