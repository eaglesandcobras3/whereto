"use client";

import Link from "next/link";
import { DiscoveryNavLink } from "@/components/feature-flags/DiscoveryNavLink";
import { useAppFeatureFlags } from "@/lib/feature-flags-client";
import { isDiscoveryEnabled } from "@/lib/nav/discovery-links";

export function EventsBreadcrumbLink() {
  const flags = useAppFeatureFlags();
  if (!isDiscoveryEnabled(flags)) {
    return <span className="text-[var(--color-text-secondary)]">Events</span>;
  }

  return (
    <DiscoveryNavLink
      params={{ type: "events" }}
      className="hover:text-[var(--color-primary)]"
    >
      Events
    </DiscoveryNavLink>
  );
}
