import { getServiceSupabase } from "@/lib/supabase/service-role";
import { normalizeUrlSegment } from "@/lib/routes/url-slug";
import {
  parseAreaFacts,
  AREA_FACTS_SELECT,
  type AreaFacts,
  type AreaFactsRow,
} from "@/lib/data/area-facts";

/** Load at-a-glance facts from `areas` (not `areas_view`) so new columns work without a view rebuild. */
export async function getAreaFactsBySlug(slug: string): Promise<AreaFacts | null> {
  const key = normalizeUrlSegment(slug);
  if (!key) return null;

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("areas")
    .select(AREA_FACTS_SELECT)
    .eq("slug", key)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getAreaFactsBySlug", { slug: key, error });
    return null;
  }

  return parseAreaFacts(data as AreaFactsRow | null);
}
