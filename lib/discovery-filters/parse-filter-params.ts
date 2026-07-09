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
  /** @deprecated Merged into `facet` — still read for old bookmarks. */
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

function parseTagsFromParams(params: RawDiscoverParams): string[] {
  const fromFacet = parseTagSlugsFromParam(params.facet ?? undefined);
  const fromAny = parseTagSlugsFromParam(params.facet_any ?? undefined);
  return [...new Set([...fromFacet, ...fromAny])];
}

export function parseDiscoveryFilterState(
  params: RawDiscoverParams,
  resolvedTownIds?: string[],
  anchorTownIds?: string[],
): DiscoveryFilterState {
  const entity_type = parseEntityType(params.type);
  const category_slug = normalizeStorefrontCategoryGroupSlug(params.category ?? undefined);
  const service_category_slug = normalizeServiceCategoryGroupSlug(params.service_category ?? undefined);

  const tags = parseTagsFromParams(params);

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
    anchor_town_ids: anchorTownIds ?? [],
    category_slug,
    service_category_slug,
    tags,
    q,
    page,
    page_size,
  });
}

/** Drop tag selections from picker options outside scoped vocabulary (does not affect search). */
export function constrainTagsToScope(
  state: DiscoveryFilterState,
  scopedSlugs: string[],
): DiscoveryFilterState {
  if (!scopedSlugs.length) return state;
  const allowed = new Set(scopedSlugs);
  return {
    ...state,
    tags: state.tags.filter((slug) => allowed.has(slug)),
  };
}
