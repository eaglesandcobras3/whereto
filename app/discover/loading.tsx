import { DiscoverPageLoading } from "@/components/discovery/DiscoverPageLoading";
import {
  getAllFeatureFlags,
  isDiscoverMapsFeatureEnabled,
} from "@/lib/feature-flags";

export default async function DiscoverLoading() {
  const flags = await getAllFeatureFlags();
  const mapsLayout = isDiscoverMapsFeatureEnabled(flags);

  return (
    <DiscoverPageLoading
      message="Loading discover…"
      variant={mapsLayout ? "map" : "page"}
    />
  );
}
