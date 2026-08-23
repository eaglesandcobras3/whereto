import { BUSINESS_CATEGORY_MEMBERSHIP_MAX } from "@/lib/categories/membership-normalize";

export type CategoryLeafOption = {
  id: string;
  title: string;
  groupTitle?: string | null;
};

export function suggestedExtraCategories(
  primaryCategoryId: string,
  selectedExtraIds: string[],
  relatedByCategoryId: Record<string, string[]>,
  leafOptions: CategoryLeafOption[],
): CategoryLeafOption[] {
  const exclude = new Set<string>([primaryCategoryId, ...selectedExtraIds]);
  const leafById = new Map(leafOptions.map((leaf) => [leaf.id, leaf]));
  const seedIds = [primaryCategoryId, ...selectedExtraIds].filter(Boolean);

  const seen = new Set<string>();
  const out: CategoryLeafOption[] = [];

  for (const sourceId of seedIds) {
    for (const relatedId of relatedByCategoryId[sourceId] ?? []) {
      if (exclude.has(relatedId) || seen.has(relatedId)) continue;
      const leaf = leafById.get(relatedId);
      if (!leaf) continue;
      seen.add(relatedId);
      out.push(leaf);
    }
  }

  return out.sort((a, b) => {
    const group = (a.groupTitle ?? "").localeCompare(b.groupTitle ?? "");
    if (group !== 0) return group;
    return a.title.localeCompare(b.title);
  });
}

export function mergeMembershipIds(
  primaryCategoryId: string,
  extraIds: string[],
  maxTotal = BUSINESS_CATEGORY_MEMBERSHIP_MAX,
): string[] {
  if (!primaryCategoryId) return extraIds.slice(0, maxTotal);
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (id: string) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    out.push(id);
  };
  push(primaryCategoryId);
  for (const id of extraIds) push(id);
  return out.slice(0, maxTotal);
}

export function extraMembershipIds(
  primaryCategoryId: string,
  membershipIds: string[],
): string[] {
  return membershipIds.filter((id) => id !== primaryCategoryId);
}
