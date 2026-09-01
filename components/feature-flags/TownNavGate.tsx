"use client";

import type { ReactNode } from "react";
import { useTownNavFeatureEnabled } from "@/lib/feature-flags-client-utils";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

/** Renders children when PostHog `town_nav` is enabled (client-evaluated). */
export function TownNavGate({ children, fallback = null }: Props) {
  const enabled = useTownNavFeatureEnabled();
  if (!enabled) return fallback;
  return children;
}
