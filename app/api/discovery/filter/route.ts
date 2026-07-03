import { NextResponse } from "next/server";
import { discoverApiBlocked } from "@/lib/feature-flags";
import { executeFilterSearch } from "@/lib/discovery-filters/execute-filter-search";
import { parseDiscoveryFilterState } from "@/lib/discovery-filters/parse-filter-params";
import { resolveTownIdsFromParam } from "@/lib/discovery-filters/resolve-town-ids";
import { getServiceSupabase } from "@/lib/supabase/service-role";

export async function GET(request: Request) {
  const blocked = await discoverApiBlocked();
  if (blocked) return blocked;

  const url = new URL(request.url);
  const sp = url.searchParams;
  const supabase = getServiceSupabase();
  const { town_ids } = await resolveTownIdsFromParam(
    supabase,
    sp.get("town"),
    sp.get("town_id"),
  );

  const state = parseDiscoveryFilterState(
    {
      type: sp.get("type"),
      town: sp.get("town"),
      town_id: sp.get("town_id"),
      category: sp.get("category"),
      service_category: sp.get("service_category"),
      facet: sp.get("facet"),
      facet_any: sp.get("facet_any"),
      q: sp.get("q"),
      page: sp.get("page"),
      page_size: sp.get("page_size"),
    },
    town_ids,
  );

  const result = await executeFilterSearch(state);

  return NextResponse.json(result);
}
