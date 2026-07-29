"use client";

import type { ReactNode } from "react";
import { useCommunityTipsFeatureEnabled } from "@/lib/feature-flags-client-utils";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

/** Renders children when PostHog `community_tips` is enabled (client-evaluated). */
export function CommunityTipsGate({ children, fallback = null }: Props) {
  const enabled = useCommunityTipsFeatureEnabled();
  if (!enabled) return fallback;
  return children;
}
