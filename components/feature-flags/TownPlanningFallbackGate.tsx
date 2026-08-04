"use client";

import type { ReactNode } from "react";
import { useTownFactsFeatureEnabled } from "@/lib/feature-flags-client-utils";

type Props = {
  /** True when the town has DB-backed at-a-glance facts. */
  hasTownFacts: boolean;
  children: ReactNode;
};

/**
 * Renders the hardcoded planning “at a glance” only when the DB-backed
 * `town_facts` section is not currently visible.
 */
export function TownPlanningFallbackGate({ hasTownFacts, children }: Props) {
  const townFactsOn = useTownFactsFeatureEnabled();
  if (hasTownFacts && townFactsOn) return null;
  return children;
}
