import type { DiscoverTagMatch } from "@/lib/discovery-filters/types";

export function formatTagMatchSummary(
  match: DiscoverTagMatch,
  labelForSlug: (slug: string) => string,
): string | null {
  const parts: string[] = [];

  if (match.matched_required.length) {
    parts.push(
      `Has ${match.matched_required.map(labelForSlug).join(", ")}`,
    );
  }
  if (match.missing_required.length) {
    parts.push(
      `Missing ${match.missing_required.map(labelForSlug).join(", ")}`,
    );
  }
  if (match.matched_any.length) {
    parts.push(
      `Also has ${match.matched_any.map(labelForSlug).join(", ")}`,
    );
  }
  if (match.missing_any.length) {
    parts.push(
      `Unconfirmed: ${match.missing_any.map(labelForSlug).join(", ")}`,
    );
  }

  return parts.length ? parts.join(" · ") : null;
}
