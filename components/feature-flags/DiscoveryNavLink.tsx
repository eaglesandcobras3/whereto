"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useAppFeatureFlags } from "@/lib/feature-flags-client";
import {
  discoveryHref,
  isDiscoveryEnabled,
  type DiscoveryLinkParams,
} from "@/lib/nav/discovery-links";

type Props = Omit<ComponentProps<typeof Link>, "href"> & {
  params?: DiscoveryLinkParams;
};

/** Discover link that hides itself when the discover feature flag is off. */
export function DiscoveryNavLink({ params, children, ...props }: Props) {
  const flags = useAppFeatureFlags();
  if (!isDiscoveryEnabled(flags)) return null;
  return (
    <Link href={discoveryHref(flags, params)} {...props}>
      {children}
    </Link>
  );
}
