"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { isPostHogEnabled } from "@/lib/analytics/posthog-config";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  if (!isPostHogEnabled()) return <>{children}</>;
  return <PHProvider client={posthog}>{children}</PHProvider>;
}
