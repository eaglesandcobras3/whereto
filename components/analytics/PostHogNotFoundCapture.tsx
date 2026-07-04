"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import posthog from "posthog-js";
import { isPostHogEnabled } from "@/lib/analytics/posthog-config";

/** Fires `not_found` for PostHog monitors when the global 404 page renders. */
export function PostHogNotFoundCapture() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isPostHogEnabled()) return;
    if (!pathname) return;

    let url = window.origin + pathname;
    const qs = searchParams?.toString();
    if (qs) url += `?${qs}`;

    posthog.capture("not_found", {
      pathname,
      $pathname: pathname,
      $current_url: url,
      referrer: document.referrer || undefined,
    });
  }, [pathname, searchParams]);

  return null;
}
