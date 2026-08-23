"use client";

import { useCallback, useEffect, useState } from "react";
import { ADMIN_SEARCH_DEBOUNCE_MS } from "@/lib/admin/admin-search-debounce";

type CategoryRow = {
  id: string;
  title: string;
  slug: string;
  parent_category_id: string | null;
  parent_title: string | null;
  business_count: number;
};

export function AdminCategoriesClient() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
    fetch(`/api/admin/categories${params}`)
      .then(async (res) => {
        const j = (await res.json()) as { categories?: CategoryRow[]; error?: string };
        if (!res.ok) throw new Error(j.error ?? "Failed to load");
        setCategories(j.categories ?? []);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [query]);

  useEffect(() => {
    const t = window.setTimeout(() => queueMicrotask(() => load()), query ? ADMIN_SEARCH_DEBOUNCE_MS : 0);
    return () => window.clearTimeout(t);
  }, [load, query]);

  const rollups = categories.filter((c) => !c.parent_category_id);
  const leaves = categories.filter((c) => c.parent_category_id);

  return (
    <div className="space-y-8">
      <p className="text-sm text-zinc-600">
        Read-only browser. Taxonomy changes still flow through{" "}
        <code className="rounded bg-zinc-100 px-1">docs/categories.csv</code> and migration scripts
        to avoid drift.
      </p>

      <label className="block">
        <span className="text-sm font-medium text-zinc-700">Search categories</span>
        <input
          type="search"
          className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Title, slug, or rollup name — e.g. restaurant or food_drink"
        />
      </label>

      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {loading ? <p className="text-sm text-zinc-500">Loading categories…</p> : null}

      {!loading && query.trim() && categories.length === 0 ? (
        <p className="text-sm text-zinc-500">No categories match your search.</p>
      ) : null}

      {!loading && rollups.length > 0 ? (
        <section>
          <h2 className="font-headline text-lg font-semibold text-zinc-900">Rollups</h2>
          <ul className="mt-3 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
            {rollups.map((c) => (
              <li key={c.id} className="flex justify-between gap-3 px-4 py-3 text-sm">
                <span className="font-medium text-zinc-900">{c.title}</span>
                <span className="font-mono text-xs text-zinc-500">{c.slug}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!loading && leaves.length > 0 ? (
        <section>
          <h2 className="font-headline text-lg font-semibold text-zinc-900">Leaf categories</h2>
          <ul className="mt-3 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
            {leaves.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <span>
                  <span className="font-medium text-zinc-900">{c.title}</span>
                  {c.parent_title ? (
                    <span className="ml-2 text-zinc-500">{c.parent_title}</span>
                  ) : null}
                </span>
                <span className="flex items-center gap-3 text-xs text-zinc-500">
                  <span>{c.business_count} listings</span>
                  <span className="font-mono">{c.slug}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
