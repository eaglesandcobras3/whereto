import type { DiscoverTagMatch } from "@/lib/discovery-filters/types";

export function formatTagMatchSummary(
  match: DiscoverTagMatch,
  labelForSlug: (slug: string) => string,
): string | null {
  const parts: string[] = [];

  if (match.matched.length) {
    parts.push(`Has ${match.matched.map(labelForSlug).join(", ")}`);
  }
  if (match.missing.length) {
    parts.push(`Missing ${match.missing.map(labelForSlug).join(", ")}`);
  }

  return parts.length ? parts.join(" · ") : null;
}
