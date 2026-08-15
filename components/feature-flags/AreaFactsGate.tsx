"use client";

import type { ReactNode } from "react";
import { useAreaFactsFeatureEnabled } from "@/lib/feature-flags-client-utils";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

/** Renders children when PostHog `area_facts` is enabled (client-evaluated). */
export function AreaFactsGate({ children, fallback = null }: Props) {
  const enabled = useAreaFactsFeatureEnabled();
  if (!enabled) return fallback;
  return children;
}
