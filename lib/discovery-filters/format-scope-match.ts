import type { DiscoverListingScopeMatch } from "@/lib/discovery-filters/score-listing";

export function formatScopeMatchNote(
  scope: DiscoverListingScopeMatch,
  preferredType: "storefront" | "service",
  hasCategoryPreference: boolean,
): string | null {
  const parts: string[] = [];

  if (!scope.entity_type_match) {
    parts.push(preferredType === "storefront" ? "Service provider" : "Storefront");
  }
  if (hasCategoryPreference && !scope.category_match) {
    parts.push("Different category");
  }

  return parts.length ? parts.join(" · ") : null;
}
