"use client";

import { useCallback, useEffect, useState } from "react";

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
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/categories")
      .then(async (res) => {
        const j = (await res.json()) as { categories?: CategoryRow[]; error?: string };
        if (!res.ok) throw new Error(j.error ?? "Failed to load");
        setCategories(j.categories ?? []);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    queueMicrotask(() => load());
  }, [load]);

  if (loading) return <p className="text-sm text-zinc-500">Loading categories…</p>;
  if (err) return <p className="text-sm text-red-600">{err}</p>;

  const rollups = categories.filter((c) => !c.parent_category_id);
  const leaves = categories.filter((c) => c.parent_category_id);

  return (
    <div className="space-y-8">
      <p className="text-sm text-zinc-600">
        Read-only browser. Taxonomy changes still flow through{" "}
        <code className="rounded bg-zinc-100 px-1">docs/categories.csv</code> and migration scripts
        to avoid drift.
      </p>
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
    </div>
  );
}
