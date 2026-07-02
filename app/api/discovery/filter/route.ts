import { NextResponse } from "next/server";
import { discoverApiBlocked } from "@/lib/feature-flags";
import { executeFilterSearch } from "@/lib/discovery-filters/execute-filter-search";
import { parseDiscoveryFilterState } from "@/lib/discovery-filters/parse-filter-params";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";

async function resolveTownIdFromSlug(slug: string | null): Promise<string | undefined> {
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

export async function GET(request: Request) {
  const blocked = await discoverApiBlocked();
  if (blocked) return blocked;

  const url = new URL(request.url);
  const sp = url.searchParams;

  const townSlug = sp.get("town");
  const townIdParam = sp.get("town_id");
  const resolvedTownId =
    townIdParam?.trim() ||
    (await resolveTownIdFromSlug(townSlug)) ||
    undefined;

  const state = parseDiscoveryFilterState(
    {
      type: sp.get("type"),
      town_id: resolvedTownId,
      town: townSlug,
      category: sp.get("category"),
      service_category: sp.get("service_category"),
      facet: sp.get("facet"),
      q: sp.get("q"),
      page: sp.get("page"),
      page_size: sp.get("page_size"),
    },
    resolvedTownId,
  );

  const result = await executeFilterSearch(state, { town_slug: townSlug ?? undefined });

  return NextResponse.json(result);
}
