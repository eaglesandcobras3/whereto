"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type GuideRow = {
  id: string;
  slug: string;
  title: string;
  status: string;
  guide_type: string | null;
  date_updated: string | null;
  enriched: boolean;
  town_name: string | null;
  search_tags?: string[];
};

const STATUS_FILTERS = ["active", "draft", "published", "archived"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

type Props = {
  initialQuery?: string;
  initialStatus?: StatusFilter;
};

function filterLabel(filter: StatusFilter): string {
  if (filter === "active") return "All";
  return filter.charAt(0).toUpperCase() + filter.slice(1);
}

function statusBadge(status: string, enriched: boolean) {
  if (status === "published") {
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
        Published
      </span>
    );
  }
  if (status === "archived") {
    return (
      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
        Archived
      </span>
    );
  }
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        enriched ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"
      }`}
    >
      {enriched ? "Draft · enriched" : "Draft · needs enrich"}
    </span>
  );
}

export function GuidesAdminClient({ initialQuery = "", initialStatus = "active" }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [guides, setGuides] = useState<GuideRow[]>([]);
  const [filter, setFilter] = useState<StatusFilter>(initialStatus);
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    setFilter(initialStatus);
  }, [initialStatus]);

  const syncUrl = useCallback(
    (nextFilter: StatusFilter, nextQuery: string) => {
      const params = new URLSearchParams();
      if (nextFilter !== "active") params.set("status", nextFilter);
      const trimmed = nextQuery.trim();
      if (trimmed) params.set("q", trimmed);
      params.delete("slug");
      params.delete("id");
      const qs = params.toString();
      router.replace(qs ? `/admin/guides?${qs}` : "/admin/guides", { scroll: false });
    },
    [router],
  );

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ status: filter });
    if (query.trim()) params.set("q", query.trim());
    fetch(`/api/admin/guides?${params.toString()}`)
      .then(async (res) => {
        const j = (await res.json()) as { guides?: GuideRow[]; error?: string };
        if (!res.ok) throw new Error(j.error ?? "Failed to load guides");
        setGuides(j.guides ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [filter, query]);

  useEffect(() => {
    const t = setTimeout(() => {
      queueMicrotask(() => load());
      syncUrl(filter, query);
    }, query ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, query, filter, syncUrl]);

  if (loading && guides.length === 0) return <p className="text-sm text-zinc-500">Loading guides…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                filter === s
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              {filterLabel(s)}
            </button>
          ))}
        </div>
        <Link
          href="/admin/guides/new"
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          New guide
        </Link>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search title, town, or tags…"
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      />

      <p className="text-sm text-zinc-600">{guides.length} guide{guides.length === 1 ? "" : "s"}</p>

      {guides.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600">
          {filter === "archived"
            ? "No archived guides."
            : query.trim()
              ? "No guides match that search."
              : "No guides yet. Create one to get started."}
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white shadow-sm">
          {guides.map((g) => (
            <li key={g.id}>
              <Link
                href={`/admin/guides/${encodeURIComponent(g.id)}`}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-zinc-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-zinc-900">{g.title}</p>
                  <p className="mt-0.5 truncate text-xs text-zinc-500">
                    {g.town_name ? g.town_name : null}
                    {g.town_name && g.guide_type ? " · " : null}
                    {g.guide_type ? g.guide_type : null}
                    {!g.town_name && !g.guide_type ? "Guide" : null}
                  </p>
                  {g.search_tags && g.search_tags.length > 0 ? (
                    <p className="mt-1 truncate text-xs text-zinc-400">
                      {g.search_tags.slice(0, 6).map((t) => t.replace(/_/g, " ")).join(" · ")}
                      {g.search_tags.length > 6 ? " …" : ""}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {statusBadge(g.status, g.enriched)}
                  {g.date_updated ? (
                    <span className="text-xs text-zinc-400">
                      {new Date(g.date_updated).toLocaleDateString()}
                    </span>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
