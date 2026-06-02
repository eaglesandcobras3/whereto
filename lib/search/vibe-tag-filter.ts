/**
 * Vibe / intent attribute matching for search filters.
 *
 * Preference tags (kid-friendly, pet-friendly) must not zero out results when
 * listings lack enriched intent_tags — most coffee shops are untagged.
 */

/** Tags that refine ranking but should not exclude untagged listings. */
export const SOFT_VIBE_TAGS = new Set([
  "kid_friendly",
  "family_friendly",
  "pet_friendly",
  "group_friendly",
  "solo_friendly",
]);

export function normalizeVibeTagList(tags: string[]): string[] {
  return [...new Set(tags.map((t) => t.toLowerCase().trim().replace(/\s+/g, "_")).filter(Boolean))];
}

/**
 * Returns true when a row should remain in results for the given vibe constraints.
 */
export function rowMatchesVibeTags(
  intentTags: string[] | null | undefined,
  requiredTags: string[] | undefined,
): boolean {
  if (!requiredTags?.length) return true;

  const required = normalizeVibeTagList(requiredTags);
  const listing = normalizeVibeTagList(
    Array.isArray(intentTags) ? intentTags.filter((t): t is string => typeof t === "string") : [],
  );

  const hard = required.filter((t) => !SOFT_VIBE_TAGS.has(t));
  const soft = required.filter((t) => SOFT_VIBE_TAGS.has(t));

  if (hard.length > 0 && !hard.every((t) => listing.includes(t))) {
    return false;
  }

  if (soft.length > 0 && listing.length > 0 && !soft.some((t) => listing.includes(t))) {
    return false;
  }

  return true;
}
