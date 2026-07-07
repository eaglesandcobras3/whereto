import { unstable_cache } from "next/cache";
import { hasPointOfInterestAreas, mergeBrowseNavItems } from "@/lib/data/browse-nav";
import { Navbar } from "./Navbar";

type Props = {
  compact?: boolean;
  showSearch?: boolean;
};

const getCachedPointOfInterestVisibility = unstable_cache(
  async () => hasPointOfInterestAreas(),
  ["navbar-point-of-interest-visibility"],
  { revalidate: 3600 },
);

/**
 * Server component wrapper for Navbar that loads browse nav data.
 * Discovery flags come from PostHog on the client (`useAppFeatureFlags`).
 */
export async function NavbarServer({ compact, showSearch }: Props) {
  const showLandmarksParks = await getCachedPointOfInterestVisibility();
  const browseNavItems = mergeBrowseNavItems(showLandmarksParks);

  return (
    <Navbar
      compact={compact}
      showSearch={showSearch}
      browseNavItems={browseNavItems}
    />
  );
}
