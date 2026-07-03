import { parseTagSlugsFromParam } from "@/lib/discovery-filters/parse-tag-params";
import {
  normalizeServiceCategoryGroupSlug,
  normalizeStorefrontCategoryGroupSlug,
} from "@/lib/discovery-filters/category-group-slugs";
import {
  DEFAULT_PAGE_SIZE,
  discoveryFilterStateSchema,
  type DiscoveryFilterState,
  type DiscoveryEntityType,
} from "@/lib/discovery-filters/filter-state";

export type RawDiscoverParams = {
  type?: string | null;
  town_id?: string | null;
  town?: string | null;
  category?: string | null;
  service_category?: string | null;
  facet?: string | null;
  facet_any?: string | null;
  q?: string | null;
  page?: string | null;
  page_size?: string | null;
};

export function parseEntityType(raw: string | null | undefined): DiscoveryEntityType {
  const t = raw?.trim().toLowerCase();
  if (t === "services" || t === "service") return "service";
  return "storefront";
}

export function parseDiscoveryFilterState(
  params: RawDiscoverParams,
  resolvedTownIds?: string[],
): DiscoveryFilterState {
  const entity_type = parseEntityType(params.type);
  const category_slug = normalizeStorefrontCategoryGroupSlug(params.category ?? undefined);
  const service_category_slug = normalizeServiceCategoryGroupSlug(params.service_category ?? undefined);

  const tags_required = parseTagSlugsFromParam(params.facet ?? undefined);
  const requiredSet = new Set(tags_required);
  const tags_any = parseTagSlugsFromParam(params.facet_any ?? undefined).filter(
    (slug) => !requiredSet.has(slug),
  );

  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const page_size = Math.min(
    48,
    Math.max(1, Number.parseInt(params.page_size ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
  );

  const town_ids = resolvedTownIds ?? [];

  const q = params.q?.trim() || undefined;

  return discoveryFilterStateSchema.parse({
    entity_type,
    town_ids,
    category_slug,
    service_category_slug,
    tags_required,
    tags_any,
    q,
    page,
    page_size,
  });
}

/** Drop tag selections that are not available in the current scoped vocabulary. */
export function constrainTagsToScope(
  state: DiscoveryFilterState,
  scopedSlugs: string[],
): DiscoveryFilterState {
  if (!scopedSlugs.length) return state;
  const allowed = new Set(scopedSlugs);
  return {
    ...state,
    tags_required: state.tags_required.filter((slug) => allowed.has(slug)),
    tags_any: state.tags_any.filter((slug) => allowed.has(slug)),
  };
}
