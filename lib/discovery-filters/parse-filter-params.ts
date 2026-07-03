import { parseFacetParamTokens } from "@/lib/discovery-filters/facet-allowlists";
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
  resolvedTownId?: string | null,
): DiscoveryFilterState {
  const entity_type = parseEntityType(params.type);
  const category_slug = normalizeStorefrontCategoryGroupSlug(params.category ?? undefined);
  const service_category_slug = normalizeServiceCategoryGroupSlug(params.service_category ?? undefined);

  const facet_tags = parseFacetParamTokens(
    params.facet ?? undefined,
    category_slug,
    service_category_slug,
    entity_type,
  );

  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const page_size = Math.min(
    48,
    Math.max(1, Number.parseInt(params.page_size ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
  );

  const town_id = resolvedTownId ?? params.town_id?.trim() ?? undefined;

  const q = params.q?.trim() || undefined;

  return discoveryFilterStateSchema.parse({
    entity_type,
    town_id,
    category_slug,
    service_category_slug,
    facet_tags,
    q,
    page,
    page_size,
  });
}
