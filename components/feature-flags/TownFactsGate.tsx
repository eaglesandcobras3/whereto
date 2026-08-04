"use client";

import type { ReactNode } from "react";
import { useTownFactsFeatureEnabled } from "@/lib/feature-flags-client-utils";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

/** Renders children when PostHog `town_facts` is enabled (client-evaluated). */
export function TownFactsGate({ children, fallback = null }: Props) {
  const enabled = useTownFactsFeatureEnabled();
  if (!enabled) return fallback;
  return children;
}
