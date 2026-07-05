import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAllFeatureFlags, isDiscoverFeatureEnabled, isDiscoverNlFeatureEnabled } from "@/lib/feature-flags";
import { buildDiscoverUrlFromLinkParams } from "@/lib/discovery-filters/build-discover-url";
import { executeFilterSearch } from "@/lib/discovery-filters/execute-filter-search";
import { loadDiscoverFilterOptions } from "@/lib/discovery-filters/load-discover-options";
import { loadScopedSearchTags } from "@/lib/discovery-filters/load-scoped-search-tags";
import {
  constrainTagsToScope,
  parseDiscoveryFilterState,
  parseEntityType,
} from "@/lib/discovery-filters/parse-filter-params";
import { hasExplicitDiscoverParams } from "@/lib/discovery-filters/parse-discover-query";
import { parseDiscoverQueryAsync } from "@/lib/discovery-filters/parse-discover-query-async";
import { resolveTownIdsFromParam } from "@/lib/discovery-filters/resolve-town-ids";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { DiscoverPageClient } from "./discover-page-client";

export const metadata: Metadata = {
  title: "Discover 30A | Browse businesses & services",
  description:
    "Filter storefront businesses and regional services on 30A by town, category, and tags.",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{
    type?: string;
    town?: string;
    town_id?: string;
    category?: string;
    service_category?: string;
    facet?: string;
    facet_any?: string;
    page?: string;
    q?: string;
  }>;
};

export default async function DiscoverPage({ searchParams }: Props) {
  const flags = await getAllFeatureFlags();
  if (!isDiscoverFeatureEnabled(flags)) {
    redirect("/");
  }

  const sp = await searchParams;

  if (
    isDiscoverNlFeatureEnabled(flags) &&
    sp.q?.trim() &&
    !hasExplicitDiscoverParams(sp)
  ) {
    const parsed = await parseDiscoverQueryAsync(sp.q);
    if (parsed.expanded) {
      redirect(buildDiscoverUrlFromLinkParams(parsed));
    }
  }

  const entityType = parseEntityType(sp.type);
  const supabase = getServiceSupabase();
  const { town_ids, town_slugs } = await resolveTownIdsFromParam(
    supabase,
    sp.town,
    sp.town_id,
  );

  const tagScope = {
    entity_type: entityType,
    town_ids,
    category_slug: sp.category,
    service_category_slug: sp.service_category,
  };

  const [scopedSearchTags, options] = await Promise.all([
    loadScopedSearchTags(tagScope),
    loadDiscoverFilterOptions(),
  ]);

  const filterState = constrainTagsToScope(
    parseDiscoveryFilterState(
      {
        type: sp.type,
        town: sp.town,
        town_id: sp.town_id,
        category: sp.category,
        service_category: sp.service_category,
        facet: sp.facet,
        facet_any: sp.facet_any,
        q: sp.q,
        page: sp.page,
      },
      town_ids,
    ),
    scopedSearchTags.map((tag) => tag.slug),
  );

  const initialResult = await executeFilterSearch(filterState);

  return (
    <DiscoverPageClient
      initialResult={initialResult}
      towns={options.towns}
      categories={options.categories}
      serviceCategories={options.serviceCategories}
      searchTags={scopedSearchTags}
      initialParams={{
        type: entityType,
        town: town_slugs.length ? town_slugs.join(",") : sp.town,
        town_ids,
        category: filterState.category_slug,
        service_category: filterState.service_category_slug,
        facet: filterState.tags.length ? filterState.tags.join(",") : sp.facet,
        q: filterState.q,
        page: filterState.page,
      }}
    />
  );
}
