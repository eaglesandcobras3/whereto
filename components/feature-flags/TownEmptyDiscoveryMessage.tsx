"use client";

import { DiscoveryNavLink } from "@/components/feature-flags/DiscoveryNavLink";
import { useAppFeatureFlags } from "@/lib/feature-flags-client";
import { isDiscoveryEnabled } from "@/lib/nav/discovery-links";

type Props = {
  townName: string;
  townId: string;
};

export function TownEmptyDiscoveryMessage({ townName, townId }: Props) {
  const flags = useAppFeatureFlags();
  if (!isDiscoveryEnabled(flags)) {
    return (
      <p className="text-[var(--color-text-secondary)]">
        No business listings in {townName} yet.
      </p>
    );
  }

  return (
    <p className="text-[var(--color-text-secondary)]">
      No business listings in {townName} yet.{" "}
      <DiscoveryNavLink
        params={{ town_id: townId }}
        className="font-medium text-[var(--color-primary)] hover:underline"
      >
        Search all of 30A
      </DiscoveryNavLink>
    </p>
  );
}
