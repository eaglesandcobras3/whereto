import { getServiceSupabase } from "@/lib/supabase/service-role";
import { DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { TOWNS_HUB_INCLUDE_OR_FILTER } from "@/lib/places/hub-browse-visibility";

export type TownRef = { name: string; slug: string };
export type CategoryRef = { name: string; slug: string };

export async function getHomeExplorerData(): Promise<{
  towns: TownRef[];
  categories: CategoryRef[];
}> {
  try {
    const supabase = getServiceSupabase();
    const [{ data: towns }, { data: categories }] = await Promise.all([
      supabase
        .from("towns")
        .select("name, slug")
        .is("archived_at", null)
        .eq("status", DIRECTUS_PUBLISHED_STATUS)
        .or(TOWNS_HUB_INCLUDE_OR_FILTER)
        .order("name"),
      supabase.from("categories").select("name, slug").order("name"),
    ]);
    return {
      towns: (towns ?? []) as TownRef[],
      categories: (categories ?? []) as CategoryRef[],
    };
  } catch {
    return { towns: [], categories: [] };
  }
}
