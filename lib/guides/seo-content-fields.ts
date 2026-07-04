/** SEO content fields stored in guides.custom_fields for internal linking and intent mapping. */
export type GuideSeoContentFields = {
  primary_keyword?: string | null;
  search_intent?: string | null;
  related_guide_slugs?: string[];
  related_town_slugs?: string[];
  related_category_slugs?: string[];
};

export function readGuideSeoContentFields(
  customFields: Record<string, unknown> | null | undefined,
): GuideSeoContentFields {
  if (!customFields || typeof customFields !== "object") return {};
  const slugs = (key: string): string[] | undefined => {
    const raw = customFields[key];
    if (!Array.isArray(raw)) return undefined;
    return raw.filter((s): s is string => typeof s === "string" && s.trim().length > 0);
  };
  return {
    primary_keyword:
      typeof customFields.primary_keyword === "string"
        ? customFields.primary_keyword
        : null,
    search_intent:
      typeof customFields.search_intent === "string" ? customFields.search_intent : null,
    related_guide_slugs: slugs("related_guide_slugs"),
    related_town_slugs: slugs("related_town_slugs"),
    related_category_slugs: slugs("related_category_slugs"),
  };
}

export function mergeGuideSeoContentFields(
  existing: Record<string, unknown> | null | undefined,
  patch: GuideSeoContentFields,
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...existing }
      : {};

  if (patch.primary_keyword !== undefined) {
    const v = patch.primary_keyword?.trim();
    if (v) base.primary_keyword = v;
    else delete base.primary_keyword;
  }
  if (patch.search_intent !== undefined) {
    const v = patch.search_intent?.trim();
    if (v) base.search_intent = v;
    else delete base.search_intent;
  }
  for (const key of [
    "related_guide_slugs",
    "related_town_slugs",
    "related_category_slugs",
  ] as const) {
    if (patch[key] !== undefined) {
      const list = patch[key]?.filter(Boolean);
      if (list?.length) base[key] = list;
      else delete base[key];
    }
  }
  return base;
}

export function parseSlugListInput(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function formatSlugListInput(slugs: string[] | undefined): string {
  return (slugs ?? []).join("\n");
}
