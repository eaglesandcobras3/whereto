"use client";

import type { ReactNode } from "react";
import { useSeoImprovementsFeatureEnabled } from "@/lib/feature-flags-client-utils";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

/** Renders children when PostHog `seo_improvements` is enabled (client-evaluated). */
export function SeoImprovementsGate({ children, fallback = null }: Props) {
  const enabled = useSeoImprovementsFeatureEnabled();
  if (!enabled) return fallback;
  return children;
}
