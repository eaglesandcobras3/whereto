"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SearchBar } from "@/components/discovery/SearchBar";

export function TownHubSearch({ townName }: { townName: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim() || `best spots in ${townName}`;
    setLoading(true);
    router.push(`/?q=${encodeURIComponent(query)}`);
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
