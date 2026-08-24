"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAdminDebouncedSearch } from "@/lib/admin/use-admin-debounced-search";

type Hit = {
  id: string;
  title: string;
  slug: string;
  status: string | null;
  town_title?: string | null;
};

type Props = {
  entity: "town" | "area";
  initialQuery?: string;
  listPath: string;
  editPathPrefix: string;
  searchApiPath: string;
};

export function AdminPlaceSearchClient({
  entity,
  initialQuery = "",
  listPath,
  editPathPrefix,
  searchApiPath,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initialQuery);
  const [results, setResults] = useState<Hit[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setQ(initialQuery);
  }, [initialQuery]);

  const syncUrl = useCallback(
    (query: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = query.trim();
      if (trimmed) params.set("q", trimmed);
      else params.delete("q");
      params.delete("slug");
      params.delete("id");
      const next = params.toString();
      router.replace(next ? `${listPath}?${next}` : listPath, { scroll: false });
    },
    [router, searchParams, listPath],
  );

  const onDebouncedQuery = useCallback(
    (query: string) => {
      if (query.length >= 2 || query.length === 0) syncUrl(query);
    },
    [syncUrl],
  );

  const onSearch = useCallback(
    async (query: string, signal: AbortSignal) => {
      setErr(null);
      try {
        const res = await fetch(
          `${searchApiPath}?q=${encodeURIComponent(query)}&limit=20`,
          { signal },
        );
        const j = (await res.json()) as { results?: Hit[]; error?: string };
        if (!res.ok) throw new Error(j.error ?? "Search failed");
        if (signal.aborted) return;
        setResults(j.results ?? []);
      } catch (e) {
        if (signal.aborted || (e instanceof DOMException && e.name === "AbortError")) return;
        setErr(e instanceof Error ? e.message : "Search failed");
        setResults([]);
      }
    },
    [searchApiPath],
  );

  const onClear = useCallback(() => {
    setResults([]);
    setErr(null);
  }, []);

  const { loading, debouncedQuery } = useAdminDebouncedSearch({
    query: q,
    onSearch,
    onClear,
    onDebouncedQuery,
  });

  const label = entity === "town" ? "town" : "area";

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-zinc-700">Search by name or slug</span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`e.g. Seaside or seaside`}
          className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
        />
      </label>
      {loading ? <p className="text-sm text-zinc-500">Searching…</p> : null}
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {results.length > 0 ? (
        <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {results.map((hit) => (
            <li key={hit.id}>
              <Link
                href={`${editPathPrefix}/${encodeURIComponent(hit.id)}`}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-zinc-50"
              >
                <span>
                  <span className="font-medium text-zinc-900">{hit.title}</span>
                  {hit.town_title ? (
                    <span className="ml-2 text-zinc-500">{hit.town_title}</span>
                  ) : null}
                  {hit.status && hit.status !== "published" ? (
                    <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600">
                      {hit.status}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 font-mono text-xs text-zinc-400">{hit.slug}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : debouncedQuery.length >= 2 && !loading ? (
        <p className="text-sm text-zinc-500">No {label} matches.</p>
      ) : null}
    </div>
  );
}
