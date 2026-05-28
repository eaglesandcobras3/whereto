/**
 * Stable key for grouping similar searches so click feedback aggregates meaningfully.
 * Same normalized query + resolved category + town scope → same cluster.
 */
export function deriveQueryClusterKey(input: {
  normalizedQuery: string;
  intentCategory: string | null | undefined;
  resolvedCategorySlugs: string[];
  townIds: string[];
}): string {
  const q = input.normalizedQuery.trim().toLowerCase().slice(0, 120);
  const cats =
    input.resolvedCategorySlugs.length > 0
      ? [...input.resolvedCategorySlugs].sort().join(",")
      : (input.intentCategory?.trim() ?? "_");
  const towns = [...input.townIds].sort().join(",") || "_";
  return `${cats}::${towns}::${q}`;
}
