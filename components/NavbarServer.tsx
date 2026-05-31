import { getAllFeatureFlags } from "@/lib/feature-flags";
import { hasPointOfInterestAreas, mergeBrowseNavItems } from "@/lib/data/browse-nav";
import { applyDiscoveryBrowseNav } from "@/lib/nav/discovery-links";
import { Navbar } from "./Navbar";

type Props = {
  compact?: boolean;
  showSearch?: boolean;
};

/**
 * Server component wrapper for Navbar that fetches feature flags.
 * Use this in page layouts instead of Navbar directly.
 */
export async function NavbarServer({ compact, showSearch }: Props) {
  const [featureFlags, showLandmarksParks] = await Promise.all([
    getAllFeatureFlags(),
    hasPointOfInterestAreas(),
  ]);
  let browseNavItems = mergeBrowseNavItems(showLandmarksParks);
  if (featureFlags["services_nav"] !== true) {
    browseNavItems = browseNavItems.filter((item) => !item.activeTypes?.includes("services"));
  }
  browseNavItems = applyDiscoveryBrowseNav(browseNavItems, featureFlags);

  return (
    <Navbar
      compact={compact}
      showSearch={showSearch}
      featureFlags={featureFlags}
      browseNavItems={browseNavItems}
    />
  );
}
