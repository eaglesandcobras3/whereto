export const EXPANDED_SECTIONS_STORAGE_PREFIX = "w30a_expanded_sections:";

export function expandedSectionsStorageKey(pathname: string): string {
  return `${EXPANDED_SECTIONS_STORAGE_PREFIX}${pathname}`;
}

export function parseStoredExpandedSectionIds(
  raw: string | null,
  validIds: readonly string[],
): Set<string> | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const valid = new Set(validIds);
    const filtered = parsed.filter(
      (id): id is string => typeof id === "string" && valid.has(id),
    );
    return new Set(filtered);
  } catch {
    return null;
  }
}

export function serializeExpandedSectionIds(ids: Set<string>): string {
  return JSON.stringify([...ids]);
}

export function defaultExpandedSectionIds(
  sectionIds: readonly string[],
  count: number,
): Set<string> {
  const initial = new Set<string>();
  for (let i = 0; i < Math.min(count, sectionIds.length); i++) {
    initial.add(sectionIds[i]!);
  }
  return initial;
}
