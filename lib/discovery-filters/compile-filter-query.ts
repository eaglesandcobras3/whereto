import { analyzeTagMatch } from "@/lib/discovery-filters/tag-match";

/** @deprecated Use analyzeTagMatch — kept for tests migrating to tag-match module. */
export function rowMatchesSearchTags(
  searchTags: string[] | null | undefined,
  selectedSlugs: string[],
): boolean {
  return analyzeTagMatch(searchTags, selectedSlugs).matches;
}
