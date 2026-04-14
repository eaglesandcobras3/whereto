import { getAllFeatureFlags } from "@/lib/feature-flags";
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
  const featureFlags = await getAllFeatureFlags();

  return (
    <Navbar
      compact={compact}
      showSearch={showSearch}
      featureFlags={featureFlags}
    />
  );
}
