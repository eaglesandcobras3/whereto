import "server-only";

import { getServiceSupabase } from "@/lib/supabase/service-role";
import { DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";

export type PublicTownOption = {
  id: string;
  title: string;
  slug: string;
};

/** Published towns for public forms (list-your-business, ask, etc.). */
export async function loadPublicTowns(): Promise<PublicTownOption[]> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("towns")
    .select("id, title, slug")
    .is("archived_at", null)
    .eq("status", DIRECTUS_PUBLISHED_STATUS)
    .order("title", { ascending: true });

  if (error) {
    console.error("loadPublicTowns", error);
    return [];
  }

  return (data ?? []).map((row) => {
    const r = row as { id: string; title: string; slug: string };
    return { id: r.id, title: r.title, slug: r.slug };
  });
}
