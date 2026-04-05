import { getServiceSupabase } from "@/lib/supabase/service-role";

export type TownRef = { name: string; slug: string };
export type CategoryRef = { name: string; slug: string };

export async function getHomeExplorerData(): Promise<{
  towns: TownRef[];
  categories: CategoryRef[];
}> {
  try {
    const supabase = getServiceSupabase();
    const [{ data: towns }, { data: categories }] = await Promise.all([
      supabase.from("towns").select("name, slug").order("name"),
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
