/**
 * Business ↔ leaf category memberships (primary + optional extras).
 * Max 5 leaves; primary must be in the set.
 */

export const BUSINESS_CATEGORY_MEMBERSHIP_MAX = 5;

export type ReplaceMembershipsInput = {
  primaryId: string | null;
  categoryIds: string[];
};

export type NormalizedMemberships = {
  primaryId: string | null;
  categoryIds: string[];
};

export function normalizeMembershipIds(input: ReplaceMembershipsInput): NormalizedMemberships {
  const primaryId = input.primaryId?.trim() || null;
  const seen = new Set<string>();
  const categoryIds: string[] = [];

  const push = (raw: string | null | undefined) => {
    const id = raw?.trim();
    if (!id || seen.has(id)) return;
    seen.add(id);
    categoryIds.push(id);
  };

  // Primary first so order is stable for UI.
  push(primaryId);
  for (const id of input.categoryIds) push(id);

  if (categoryIds.length > BUSINESS_CATEGORY_MEMBERSHIP_MAX) {
    throw new Error(
      `At most ${BUSINESS_CATEGORY_MEMBERSHIP_MAX} categories allowed (got ${categoryIds.length}).`,
    );
  }

  if (primaryId && !categoryIds.includes(primaryId)) {
    throw new Error("Primary category must be included in category memberships.");
  }

  if (!primaryId && categoryIds.length > 0) {
    throw new Error("Primary category is required when category memberships are set.");
  }

  return { primaryId, categoryIds };
}

/** Pure validation against a set of known leaf category ids. */
export function assertLeafCategoryIds(
  categoryIds: string[],
  leafIdSet: ReadonlySet<string>,
): void {
  for (const id of categoryIds) {
    if (!leafIdSet.has(id)) {
      throw new Error(`Category must be a leaf taxonomy id: ${id}`);
    }
  }
}
