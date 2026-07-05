import type { DiscoverSearchTagOption } from "@/lib/discovery-filters/load-discover-options";
import { formatSearchTagLabel } from "@/lib/discovery-filters/search-tag-label";

/** Ensure active URL/NL tag selections appear in the sidebar picker even when absent from scoped pool. */
export function mergeActiveTagsIntoScopedOptions(
  scoped: DiscoverSearchTagOption[],
  activeSlugs: string[],
): DiscoverSearchTagOption[] {
  if (!activeSlugs.length) return scoped;

  const scopedSlugs = new Set(scoped.map((tag) => tag.slug));
  const extras: DiscoverSearchTagOption[] = [];

  for (const slug of activeSlugs) {
    if (!slug || scopedSlugs.has(slug)) continue;
    extras.push({
      slug,
      label: formatSearchTagLabel(slug),
      count: 0,
    });
  }

  return extras.length ? [...scoped, ...extras] : scoped;
}

export function appliedTagsFromFilters(applied: Record<string, unknown>): string[] {
  const tags = applied.tags;
  if (!Array.isArray(tags)) return [];
  return tags.map((tag) => String(tag)).filter(Boolean);
}
