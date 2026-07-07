"use client";

import type { PublicPlacePage } from "@/lib/data/public-place-by-slug";
import { DiscoveryNavLink } from "@/components/feature-flags/DiscoveryNavLink";
import { useAppFeatureFlags } from "@/lib/feature-flags-client";
import { isDiscoveryEnabled } from "@/lib/nav/discovery-links";

type PlaceSlice = Pick<
  PublicPlacePage,
  "title" | "town_id" | "source" | "id" | "parent_area_id"
>;

function discoveryParamsForArea(place: PlaceSlice) {
  const townId = place.town_id?.trim() || undefined;
  if (place.source === "area") {
    return { area_id: place.id, town_id: townId };
  }
  if (place.parent_area_id) {
    return { area_id: place.parent_area_id, town_id: townId };
  }
  if (townId) {
    return { town_id: townId };
  }
  return null;
}

export function AreaEmptyDiscoveryMessage({ place }: { place: PlaceSlice }) {
  const flags = useAppFeatureFlags();
  const params = discoveryParamsForArea(place);

  if (!isDiscoveryEnabled(flags) || !params) {
    return (
      <p className="text-[var(--color-text-secondary)]">
        No business listings in {place.title} yet.
      </p>
    );
  }

  return (
    <p className="text-[var(--color-text-secondary)]">
      No business listings in {place.title} yet.{" "}
      <DiscoveryNavLink
        params={params}
        className="font-medium text-[var(--color-primary)] hover:underline"
      >
        Search nearby
      </DiscoveryNavLink>
    </p>
  );
}
