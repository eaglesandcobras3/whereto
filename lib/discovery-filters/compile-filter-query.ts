import { analyzeTagMatch } from "@/lib/discovery-filters/tag-match";

/** @deprecated Use analyzeTagMatch — kept for tests migrating to tag-match module. */
export function rowMatchesSearchTags(
  searchTags: string[] | null | undefined,
  requiredSlugs: string[],
): boolean {
  return analyzeTagMatch(searchTags, requiredSlugs, []).strict_match;
}
