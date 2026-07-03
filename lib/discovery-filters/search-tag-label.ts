/** Human label for a `search_tags` / vocabulary slug (snake_case). */
export function formatSearchTagLabel(slug: string): string {
  return slug
    .trim()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function normalizeSearchTagSlug(raw: string): string | null {
  const slug = raw.trim().toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  if (!slug || !/^[a-z0-9_]+$/.test(slug)) return null;
  return slug;
}
