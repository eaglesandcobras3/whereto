"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SearchBar } from "@/components/discovery/SearchBar";
import { useAppFeatureFlags } from "@/lib/feature-flags-client";
import { discoveryHref, showHubDiscoveryUi } from "@/lib/nav/discovery-links";

export function BusinessesHubSearch() {
  const featureFlags = useAppFeatureFlags();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  if (!showHubDiscoveryUi(featureFlags)) return null;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim() || "best local businesses on 30A";
    setLoading(true);
    router.push(discoveryHref(featureFlags, { q: query, type: "businesses" }));
    setLoading(false);
  }

  return (
    <SearchBar
      value={q}
      onChange={setQ}
      onSubmit={onSubmit}
      loading={loading}
      placeholder='Try "casual dinner near Rosemary Beach"'
      variant="hero"
    />
  );
}
