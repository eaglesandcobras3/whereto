import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAllFeatureFlags, isDiscoverFeatureEnabled } from "@/lib/feature-flags";
import { executeFilterSearch } from "@/lib/discovery-filters/execute-filter-search";
import { loadDiscoverFilterOptions } from "@/lib/discovery-filters/load-discover-options";
import {
  parseDiscoveryFilterState,
  parseEntityType,
} from "@/lib/discovery-filters/parse-filter-params";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
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
    page?: string;
    q?: string;
  }>;
};

async function resolveTownIdFromSlug(slug: string | undefined): Promise<string | undefined> {
  if (!slug?.trim()) return undefined;
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("towns")
    .select("id")
    .eq("slug", slug.trim())
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .maybeSingle();
  return data ? String((data as { id: string }).id) : undefined;
}

export default async function DiscoverPage({ searchParams }: Props) {
  const flags = await getAllFeatureFlags();
  if (!isDiscoverFeatureEnabled(flags)) {
    redirect("/");
  }

  const sp = await searchParams;
  const entityType = parseEntityType(sp.type);
  const townSlug = sp.town?.trim() || undefined;
  const resolvedTownId =
    sp.town_id?.trim() || (await resolveTownIdFromSlug(townSlug)) || undefined;

  const filterState = parseDiscoveryFilterState(
    {
      type: sp.type,
      town_id: resolvedTownId,
      town: townSlug,
      category: sp.category,
      service_category: sp.service_category,
      facet: sp.facet,
      q: sp.q,
      page: sp.page,
    },
    resolvedTownId,
  );

  const [initialResult, options] = await Promise.all([
    executeFilterSearch(filterState, { town_slug: townSlug }),
    loadDiscoverFilterOptions(),
  ]);

  return (
    <DiscoverPageClient
      initialResult={initialResult}
      towns={options.towns}
      categories={options.categories}
      serviceCategories={options.serviceCategories}
      searchTags={options.searchTags}
      initialParams={{
        type: entityType,
        town: townSlug,
        town_id: resolvedTownId,
        category: filterState.category_slug,
        service_category: filterState.service_category_slug,
        facet: sp.facet,
        q: filterState.q,
        page: filterState.page,
      }}
    />
  );
}
