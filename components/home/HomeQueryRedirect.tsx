"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppFeatureFlags } from "@/lib/feature-flags-client";
import { discoveryHref, isDiscoveryEnabled } from "@/lib/nav/discovery-links";

/**
 * Preserve legacy `/?q=` behavior without making the homepage request-time dynamic.
 * When a query is present and discovery is enabled, redirect client-side.
 */
export function HomeQueryRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const flags = useAppFeatureFlags();
  const redirectedRef = useRef(false);

  useEffect(() => {
    const query = searchParams.get("q")?.trim();
    if (!query || redirectedRef.current) return;
    if (!isDiscoveryEnabled(flags)) return;

    redirectedRef.current = true;
    router.replace(discoveryHref(flags, { q: query }));
  }, [flags, router, searchParams]);

  return null;
}
