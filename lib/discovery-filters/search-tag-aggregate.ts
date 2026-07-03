export function normalizeSearchTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((t): t is string => typeof t === "string" && t.trim().length > 0);
}

export function aggregateSearchTagCounts(
  rows: Array<Record<string, unknown>>,
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const seen = new Set<string>();
    for (const tag of normalizeSearchTags(row.search_tags)) {
      if (seen.has(tag)) continue;
      seen.add(tag);
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return counts;
}
