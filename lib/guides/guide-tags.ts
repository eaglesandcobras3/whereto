/** Special guide tag: show this guide on every town and area page. */
export const GUIDE_TAG_ALL_TOWNS = "all_towns";

/** Normalize a freeform guide tag to snake_case slug. */
export function normalizeGuideTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function normalizeGuideTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const tag = normalizeGuideTag(item);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
  }
  return out;
}

export function guideTagLabel(tag: string): string {
  if (tag === GUIDE_TAG_ALL_TOWNS) return "All towns";
  return tag.replace(/_/g, " ");
}
