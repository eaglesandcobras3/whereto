"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SearchBar } from "@/components/discovery/SearchBar";
import { useAppFeatureFlags } from "@/lib/feature-flags-client";
import { discoveryHref } from "@/lib/nav/discovery-links";

export function GuidesHubSearch() {
  const featureFlags = useAppFeatureFlags();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim() || "30A travel guides and local tips";
    setLoading(true);
    router.push(discoveryHref(featureFlags, { q: query, type: "guides" }));
    setLoading(false);
  }

  return (
    <SearchBar
      value={q}
      onChange={setQ}
      onSubmit={onSubmit}
      loading={loading}
      placeholder='Try "first time visiting 30A" or "best beaches"'
      variant="hero"
    />
  );
}
