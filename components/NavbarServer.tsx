import { getAllFeatureFlags, isGuidesEnabled } from "@/lib/feature-flags";
import { hasPointOfInterestAreas, mergeBrowseNavItems, filterGuidesNavItem } from "@/lib/data/browse-nav";
import { Navbar } from "./Navbar";

type Props = {
  compact?: boolean;
  showSearch?: boolean;
};

/**
 * Server component wrapper for Navbar that loads browse nav data.
 * Discovery flags come from PostHog on the client (`useAppFeatureFlags`).
 */
export async function NavbarServer({ compact, showSearch }: Props) {
  const [showLandmarksParks, flags] = await Promise.all([
    hasPointOfInterestAreas(),
    getAllFeatureFlags(),
  ]);
  const browseNavItems = filterGuidesNavItem(
    mergeBrowseNavItems(showLandmarksParks),
    isGuidesEnabled(flags),
  );

  return (
    <Navbar
      compact={compact}
      showSearch={showSearch}
      browseNavItems={browseNavItems}
    />
  );
}
