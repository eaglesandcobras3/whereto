"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SearchBar } from "@/components/discovery/SearchBar";
import { useAppFeatureFlags } from "@/lib/feature-flags-client";
import { discoveryHref, showHubDiscoveryUi } from "@/lib/nav/discovery-links";

export function TownHubSearch({ townName }: { townName: string }) {
  const featureFlags = useAppFeatureFlags();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  if (!showHubDiscoveryUi(featureFlags)) return null;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim() || `best spots in ${townName}`;
    setLoading(true);
    router.push(discoveryHref(featureFlags, { q: query }));
    setLoading(false);
  }

  return (
    <SearchBar
      value={q}
      onChange={setQ}
      onSubmit={onSubmit}
      loading={loading}
      placeholder={`Ask what to do in ${townName}…`}
    />
  );
}
