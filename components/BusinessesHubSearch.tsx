"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SearchBar } from "@/components/discovery/SearchBar";

export function BusinessesHubSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim() || "best local businesses on 30A";
    setLoading(true);
    router.push(`/search?q=${encodeURIComponent(query)}&type=businesses`);
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
