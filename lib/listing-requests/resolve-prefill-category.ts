/** Resolve which unified leaf category to prefill on free intake verify/update. */

export type PrefillCategoryEmbed = {
  id?: string | null;
  title?: string | null;
  parent_category_id?: string | null;
  /** Parent/rollup title when available. */
  parent_title?: string | null;
};

export type ResolvedPrefillCategory = {
  category_id: string | null;
  category_title: string | null;
  category_group_title: string | null;
};

/**
 * Prefer a confirmed leaf from the `business_categories` embed.
 * Rollups are not valid on the intake form (leaf required).
 * Do not fall back to deprecated `service_category_id` (different taxonomy).
 */
export function resolvePrefillCategory(input: {
  primary_category_id?: string | null;
  category?: PrefillCategoryEmbed | PrefillCategoryEmbed[] | null;
}): ResolvedPrefillCategory {
  const empty: ResolvedPrefillCategory = {
    category_id: null,
    category_title: null,
    category_group_title: null,
  };

  const raw = input.category;
  const cat = Array.isArray(raw) ? raw[0] : raw;
  const catId = cat?.id ? String(cat.id) : null;
  const parentId = cat?.parent_category_id ? String(cat.parent_category_id) : null;
  const title = cat?.title ? String(cat.title).trim() : "";
  const groupTitle = cat?.parent_title ? String(cat.parent_title).trim() : "";

  if (catId && parentId) {
    return {
      category_id: catId,
      category_title: title || null,
      category_group_title: groupTitle || null,
    };
  }

  if (catId && !parentId) {
    // Rollup / parent node — not selectable on the leaf typeahead.
    return empty;
  }

  const primary = input.primary_category_id ? String(input.primary_category_id) : null;
  if (primary) {
    return {
      category_id: primary,
      category_title: null,
      category_group_title: null,
    };
  }

  return empty;
}
