import { getAllFeatureFlags, isAskEnabled } from "@/lib/feature-flags";
import { hasPointOfInterestAreas, mergeBrowseNavItems } from "@/lib/data/browse-nav";
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
  if (isAskEnabled(featureFlags)) {
    browseNavItems = [
      ...browseNavItems,
      { label: "Ask", href: "/ask", activePaths: ["/ask"] },
    ];
  }

  return (
    <Navbar
      compact={compact}
      showSearch={showSearch}
      featureFlags={featureFlags}
      browseNavItems={browseNavItems}
    />
  );
}
