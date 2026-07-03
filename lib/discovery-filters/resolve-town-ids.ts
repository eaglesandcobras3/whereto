import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { parseTownSlugsFromParam } from "@/lib/discovery-filters/parse-town-params";

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

export async function resolveTownIdsFromParam(
  supabase: SupabaseClient,
  townParam: string | null | undefined,
  townIdParam: string | null | undefined,
): Promise<{ town_ids: string[]; town_slugs: string[] }> {
  const town_slugs = parseTownSlugsFromParam(townParam ?? undefined);
  const extraIds = townIdParam?.trim() ? [townIdParam.trim()] : [];
  const town_ids = await resolveTownIdsFromSlugs(supabase, town_slugs, extraIds);
  return { town_ids, town_slugs };
}
