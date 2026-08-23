"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Hit = {
  id: string;
  title: string;
  slug: string;
  town_title: string | null;
  status: string | null;
};

type Props = {
  initialQuery?: string;
};

export function AdminBusinessSearchClient({ initialQuery = "" }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initialQuery);
  const [results, setResults] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
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
      router.replace(next ? `/admin/businesses?${next}` : "/admin/businesses", { scroll: false });
    },
    [router, searchParams],
  );

  const search = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/admin/businesses/search?q=${encodeURIComponent(query.trim())}&limit=16`,
      );
      const j = (await res.json()) as { results?: Hit[]; error?: string };
      if (!res.ok) throw new Error(j.error ?? "Search failed");
      setResults(j.results ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void search(q);
      if (q.trim().length >= 2 || q.trim().length === 0) {
        syncUrl(q);
      }
    }, 250);
    return () => window.clearTimeout(handle);
  }, [q, search, syncUrl]);

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-zinc-700">Search by name or slug</span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. IV Bar or iv-bar"
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
                href={`/admin/businesses/${encodeURIComponent(hit.id)}`}
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
      ) : q.trim().length >= 2 && !loading ? (
        <p className="text-sm text-zinc-500">No matches.</p>
      ) : null}
    </div>
  );
}
