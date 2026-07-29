/** Human label for a `search_tags` / vocabulary slug (snake_case). */
export function formatSearchTagLabel(slug: string): string {
  return slug
    .trim()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Prefer vocabulary `description` when set; otherwise derive from slug. */
export function labelForSearchTag(
  slug: string,
  description?: string | null,
): string {
  const trimmed = description?.trim();
  return trimmed || formatSearchTagLabel(slug);
}

export function normalizeSearchTagSlug(raw: string): string | null {
  const slug = raw.trim().toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  if (!slug || !/^[a-z0-9_]+$/.test(slug)) return null;
  return slug;
}
