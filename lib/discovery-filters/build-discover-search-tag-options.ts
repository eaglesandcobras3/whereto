import type { DiscoverSearchTagOption } from "@/lib/discovery-filters/load-discover-options";
import { labelForSearchTag } from "@/lib/discovery-filters/search-tag-label";

export type DiscoverSearchTagVocabRow = { slug: string; description: string | null };

/** Full vocabulary for the keyword typeahead; counts reflect listings in the current scope. */
export function buildDiscoverSearchTagOptions(
  vocab: DiscoverSearchTagVocabRow[],
  scopedCounts: Map<string, number>,
): DiscoverSearchTagOption[] {
  const descriptionBySlug = new Map(vocab.map((v) => [v.slug, v.description]));
  const vocabSlugs = new Set(vocab.map((v) => v.slug));

  const orderedSlugs =
    vocab.length > 0
      ? [
          ...vocab.map((v) => v.slug),
          ...[...scopedCounts.keys()]
            .filter((slug) => !vocabSlugs.has(slug))
            .sort((a, b) => a.localeCompare(b)),
        ]
      : [...scopedCounts.keys()].sort((a, b) => a.localeCompare(b));

  return orderedSlugs.map((slug) => ({
    slug,
    label: labelForSearchTag(slug, descriptionBySlug.get(slug)),
    count: scopedCounts.get(slug) ?? 0,
  }));
}
