import { NextResponse } from "next/server";
import { discoverApiBlocked } from "@/lib/feature-flags";
import { discoverTownFilterApplies } from "@/lib/discovery-filters/discover-town-filter";
import { executeFilterSearch } from "@/lib/discovery-filters/execute-filter-search";
import { loadScopedSearchTags } from "@/lib/discovery-filters/load-scoped-search-tags";
import { mergeActiveTagsIntoScopedOptions } from "@/lib/discovery-filters/merge-scoped-search-tags";
import {
  parseDiscoveryFilterState,
  parseEntityType,
} from "@/lib/discovery-filters/parse-filter-params";
import { resolveTownIdsFromParam } from "@/lib/discovery-filters/resolve-town-ids";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export async function GET(request: Request) {
  const blocked = await discoverApiBlocked();
  if (blocked) return blocked;

  const url = new URL(request.url);
  const sp = url.searchParams;
  const supabase = getServiceSupabase();
  const entityType = parseEntityType(sp.get("type"));
  const townScope =
    sp.get("town_scope") === "near"
      ? "near"
      : sp.get("town_scope") === "exact"
        ? "exact"
        : undefined;

  // Services are corridor-wide — ignore town params entirely.
  const resolvedTowns = !discoverTownFilterApplies(entityType)
      ? {
          town_ids: [] as string[],
          effective_town_slugs: [] as string[],
          anchor_town_ids: [] as string[],
          anchor_town_slugs: [] as string[],
        }
      : await resolveTownIdsFromParam(supabase, sp.get("town"), sp.get("town_id"), {
          townScope,
        });

  const { town_ids, effective_town_slugs, anchor_town_ids, anchor_town_slugs } =
    resolvedTowns;

  const state = parseDiscoveryFilterState(
    {
      type: sp.get("type"),
      town: discoverTownFilterApplies(entityType) ? sp.get("town") : null,
      town_id: discoverTownFilterApplies(entityType) ? sp.get("town_id") : null,
      category: sp.get("category"),
      service_category: sp.get("service_category"),
      facet: sp.get("facet"),
      facet_any: sp.get("facet_any"),
      q: sp.get("q"),
      page: sp.get("page"),
      page_size: sp.get("page_size"),
    },
    town_ids,
    anchor_town_ids,
  );

  const [result, scopedSearchTags] = await Promise.all([
    executeFilterSearch(state),
    loadScopedSearchTags({
      entity_type: entityType,
      town_ids,
      category_slug: sp.get("category") ?? undefined,
      service_category_slug: sp.get("service_category") ?? undefined,
    }),
  ]);

  const search_tags = mergeActiveTagsIntoScopedOptions(scopedSearchTags, state.tags);

  return NextResponse.json({ ...result, search_tags, effective_town_slugs, anchor_town_slugs });
}
