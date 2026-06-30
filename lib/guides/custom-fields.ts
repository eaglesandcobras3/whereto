/** Enrichment metadata stored in `guides.custom_fields` JSON. */
export type GuideCustomFields = {
  enriched_at?: string | null;
  search_profile?: string | null;
  enrichment_version?: number;
};

export function parseGuideCustomFields(raw: unknown): GuideCustomFields {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  return {
    enriched_at: typeof o.enriched_at === "string" ? o.enriched_at : null,
    search_profile: typeof o.search_profile === "string" ? o.search_profile : null,
    enrichment_version:
      typeof o.enrichment_version === "number" ? o.enrichment_version : undefined,
  };
}

export function isGuideEnriched(customFields: unknown): boolean {
  const cf = parseGuideCustomFields(customFields);
  return Boolean(cf.enriched_at?.trim());
}

export function hasGuideSearchProfile(customFields: unknown): boolean {
  const cf = parseGuideCustomFields(customFields);
  return Boolean(cf.search_profile?.trim());
}

export function mergeGuideCustomFields(
  existing: unknown,
  patch: GuideCustomFields,
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    base[k] = v;
  }
  return base;
}
