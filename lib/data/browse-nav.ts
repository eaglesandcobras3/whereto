import "server-only";

import { getServiceSupabase } from "@/lib/supabase/service-role";
import { BROWSE_NAV_ITEMS, type BrowseNavItem } from "@/lib/nav/browse-links";

export async function hasPointOfInterestAreas(): Promise<boolean> {
  try {
    const supabase = getServiceSupabase();
    const { count, error } = await supabase
      .from("areas")
      .select("id", { count: "exact", head: true })
      .eq("area_type", "point_of_interest")
      .eq("include_in_site_browse", true);
    if (error) return false;
    return (count ?? 0) > 0;
  } catch {
    return false;
  }
}

/** Insert “Landmarks & parks” after “Areas” when there is at least one `point_of_interest` row. */
export function mergeBrowseNavItems(showLandmarksParks: boolean): BrowseNavItem[] {
  if (!showLandmarksParks) return [...BROWSE_NAV_ITEMS];
  const landmarksParks: BrowseNavItem = {
    label: "Landmarks & parks",
    href: "/search?type=access",
    activeTypes: ["access"],
  };
  const idx = BROWSE_NAV_ITEMS.findIndex((i) => i.label === "Areas");
  if (idx === -1) return [...BROWSE_NAV_ITEMS, landmarksParks];
  return [...BROWSE_NAV_ITEMS.slice(0, idx + 1), landmarksParks, ...BROWSE_NAV_ITEMS.slice(idx + 1)];
}
