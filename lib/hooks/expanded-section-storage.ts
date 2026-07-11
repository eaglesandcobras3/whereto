export const EXPANDED_SECTIONS_STORAGE_PREFIX = "w30a_expanded_sections:";

export function expandedSectionsStorageKey(pathname: string, scope?: string): string {
  const base = `${EXPANDED_SECTIONS_STORAGE_PREFIX}${pathname}`;
  return scope ? `${base}:${scope}` : base;
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

export function sectionIdsFromKey(sectionIdsKey: string): string[] {
  return sectionIdsKey.length > 0 ? sectionIdsKey.split("\0") : [];
}

export function expandedSectionSetsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const id of a) {
    if (!b.has(id)) return false;
  }
  return true;
}
