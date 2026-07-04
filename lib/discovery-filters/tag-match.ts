export type TagMatchAnalysis = {
  matched: string[];
  missing: string[];
  /** At least one selected tag is present on the listing. */
  matches: boolean;
  /** Higher = better fit when sorting results. */
  score: number;
};

export function analyzeTagMatch(
  searchTags: string[] | null | undefined,
  selected: string[],
): TagMatchAnalysis {
  const present = new Set(
    (searchTags ?? []).filter((t) => typeof t === "string" && t.trim().length > 0),
  );

  const matched = selected.filter((t) => present.has(t));
  const missing = selected.filter((t) => !present.has(t));

  const matches = selected.length === 0 || matched.length > 0;

  return {
    matched,
    missing,
    matches,
    score: matched.length,
  };
}

export function compareTagMatchScore(a: TagMatchAnalysis, b: TagMatchAnalysis): number {
  return b.score - a.score;
}
