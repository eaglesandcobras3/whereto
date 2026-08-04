import { getServiceSupabase } from "@/lib/supabase/service-role";
import { normalizeUrlSegment } from "@/lib/routes/url-slug";
import {
  parseTownFacts,
  TOWN_FACTS_SELECT,
  type TownFacts,
  type TownFactsRow,
} from "@/lib/data/town-facts";

/** Load at-a-glance facts from `towns` (not `towns_view`) so new columns work without a view rebuild. */
export async function getTownFactsBySlug(slug: string): Promise<TownFacts | null> {
  const key = normalizeUrlSegment(slug);
  if (!key) return null;

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("towns")
    .select(TOWN_FACTS_SELECT)
    .eq("slug", key)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getTownFactsBySlug", { slug: key, error });
    return null;
  }

  return parseTownFacts(data as TownFactsRow | null);
}
