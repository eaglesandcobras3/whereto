import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { expandCorridorTownSlugsForNearSearch } from "@/lib/discovery-filters/corridor-town-scope";
import { DIRECTUS_PUBLISHED_STATUS, BROWSE_VISIBLE_NOT_HIDDEN } from "@/lib/shop/public-listing-filters";
import { parseTownSlugsFromParam } from "@/lib/discovery-filters/parse-town-params";

export type ResolveTownIdsOptions = {
  /** When `near`, expand anchor town(s) to a realistic corridor zone. */
  townScope?: "exact" | "near";
};

export async function resolveTownIdsFromSlugs(
  supabase: SupabaseClient,
  townSlugs: string[],
  extraTownIds: string[] = [],
): Promise<string[]> {
  const ids = new Set<string>();

  for (const id of extraTownIds) {
    const trimmed = id.trim();
    if (trimmed) ids.add(trimmed);
  }

  const slugs = townSlugs.map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (slugs.length) {
    const { data } = await supabase
      .from("towns")
      .select("id, slug")
      .in("slug", slugs)
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS);

    for (const row of data ?? []) {
      ids.add(String((row as { id: string }).id));
    }
  }

  return [...ids];
}

function slugsForSearch(
  townSlugs: string[],
  options?: ResolveTownIdsOptions,
): { slugs: string[]; searchAllTowns: boolean } {
  if (!townSlugs.length || options?.townScope !== "near") {
    return { slugs: townSlugs, searchAllTowns: false };
  }
  return expandCorridorTownSlugsForNearSearch(townSlugs);
}

async function loadBrowseVisibleTownSlugs(supabase: SupabaseClient): Promise<string[]> {
  const { data } = await supabase
    .from("towns")
    .select("slug")
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .or(BROWSE_VISIBLE_NOT_HIDDEN)
    .order("title", { ascending: true });

  return (data ?? []).map((row) => String((row as { slug: string }).slug));
}

async function resolveEffectiveTownSlugs(
  supabase: SupabaseClient,
  townSlugs: string[],
  extraTownIds: string[],
  searchSlugs: string[],
  searchAllTowns: boolean,
  options?: ResolveTownIdsOptions,
): Promise<string[]> {
  if (searchAllTowns || (!townSlugs.length && !extraTownIds.length)) {
    return loadBrowseVisibleTownSlugs(supabase);
  }

  if (options?.townScope === "near" && searchSlugs.length) {
    return searchSlugs;
  }

  return townSlugs;
}

export async function resolveTownIdsFromParam(
  supabase: SupabaseClient,
  townParam: string | null | undefined,
  townIdParam: string | null | undefined,
  options?: ResolveTownIdsOptions,
): Promise<{
  town_ids: string[];
  town_slugs: string[];
  effective_town_slugs: string[];
  anchor_town_ids: string[];
  anchor_town_slugs: string[];
}> {
  const town_slugs = parseTownSlugsFromParam(townParam ?? undefined);
  const extraIds = townIdParam?.trim() ? [townIdParam.trim()] : [];
  const { slugs: searchSlugs, searchAllTowns } = slugsForSearch(town_slugs, options);
  const anchor_town_slugs =
    options?.townScope === "near" && town_slugs.length ? town_slugs : [];
  const effective_town_slugs = await resolveEffectiveTownSlugs(
    supabase,
    town_slugs,
    extraIds,
    searchSlugs,
    searchAllTowns,
    options,
  );
  const anchor_town_ids =
    options?.townScope === "near" && town_slugs.length
      ? await resolveTownIdsFromSlugs(supabase, town_slugs)
      : [];

  if (searchAllTowns) {
    return {
      town_ids: extraIds.length ? extraIds : [],
      town_slugs,
      effective_town_slugs,
      anchor_town_ids,
      anchor_town_slugs,
    };
  }

  const town_ids = await resolveTownIdsFromSlugs(supabase, searchSlugs, extraIds);
  return { town_ids, town_slugs, effective_town_slugs, anchor_town_ids, anchor_town_slugs };
}
