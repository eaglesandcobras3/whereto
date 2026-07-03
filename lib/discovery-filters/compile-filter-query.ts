/** Match when listing `search_tags` contains every required slug (Search V2 required_tags semantics). */
export function rowMatchesSearchTags(
  searchTags: string[] | null | undefined,
  requiredSlugs: string[],
): boolean {
  if (!requiredSlugs.length) return true;
  if (!Array.isArray(searchTags) || !searchTags.length) return false;
  const present = new Set(searchTags);
  return requiredSlugs.every((slug) => present.has(slug));
}
