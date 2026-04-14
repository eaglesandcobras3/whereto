"use client";

import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Collection = { id: number; name: string; sort_order: number };
type SaveRow = {
  id: number;
  collection_id: number | null;
  businesses: {
    id: string;
    name: string;
    slug?: string;
    address: string | null;
    ai_summary: string | null;
  } | null;
};

export default function SavedPage() {
  const [saves, setSaves] = useState<SaveRow[] | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filterCollectionId, setFilterCollectionId] = useState<
    number | "all" | "uncat"
  >("all");
  const [newCollectionName, setNewCollectionName] = useState("");

  const load = useCallback(async () => {
    const rSaves = await fetch("/api/saves");
    if (rSaves.status === 401) {
      setError("sign_in_required");
      return;
    }
    const j = await rSaves.json();
    if (j?.saves) setSaves(j.saves);
    else if (j?.error) setError(j.error);

    const rCols = await fetch("/api/collections");
    if (rCols.ok) {
      const c = await rCols.json();
      if (c?.collections) setCollections(c.collections);
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      void load();
    });
  }, [load]);

  const filtered = useMemo(() => {
    if (!saves) return [];
    if (filterCollectionId === "all") return saves;
    if (filterCollectionId === "uncat") {
      return saves.filter((s) => s.collection_id == null);
    }
    return saves.filter((s) => s.collection_id === filterCollectionId);
  }, [saves, filterCollectionId]);

  async function createCollection(e: React.FormEvent) {
    e.preventDefault();
    const name = newCollectionName.trim();
    if (!name) return;
    const res = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setNewCollectionName("");
      void load();
    }
  }

  async function moveSave(businessId: string, collectionId: number | null) {
    const res = await fetch("/api/saves", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ business_id: businessId, collection_id: collectionId }),
    });
    if (res.ok) void load();
  }

  if (error === "sign_in_required") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-zinc-700">Sign in to see saved places.</p>
        <Link href="/login" className="mt-4 inline-block text-teal-700 underline">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-900">Saved</h1>
        <Link href="/" className="text-sm text-[var(--accent)] hover:underline">
          Search
        </Link>
      </div>

      <div className="mb-8 flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Collection
          </label>
          <select
            value={
              filterCollectionId === "all"
                ? "all"
                : filterCollectionId === "uncat"
                  ? "uncat"
                  : String(filterCollectionId)
            }
            onChange={(e) => {
              const v = e.target.value;
              if (v === "all") setFilterCollectionId("all");
              else if (v === "uncat") setFilterCollectionId("uncat");
              else setFilterCollectionId(Number(v));
            }}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="all">All saves</option>
            <option value="uncat">Uncategorized</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <form onSubmit={createCollection} className="flex flex-1 gap-2">
          <input
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            placeholder="New collection name"
            className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Add
          </button>
        </form>
      </div>

      {filterCollectionId === "uncat" ? (
        <p className="mb-4 text-sm text-zinc-500">
          Showing saves not assigned to a collection.
        </p>
      ) : null}

      {saves === null ? (
        <p className="text-zinc-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-zinc-600">No saves in this view.</p>
      ) : (
        <ul className="space-y-4">
          {filtered.map((s) =>
            s.businesses ? (
              <li
                key={s.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    {s.collection_id != null ? (
                      <p className="text-xs text-zinc-500">
                        Collection:{" "}
                        {collections.find((c) => c.id === s.collection_id)?.name ?? s.collection_id}
                      </p>
                    ) : null}
                    <p className="font-medium text-zinc-900">{s.businesses.name}</p>
                    {s.businesses.address ? (
                      <p className="text-sm text-zinc-600">{s.businesses.address}</p>
                    ) : null}
                  </div>
                  {s.businesses.slug ? (
                    <Link
                      href={`/business/${s.businesses.slug}`}
                      className="text-sm text-[var(--accent)] hover:underline"
                    >
                      Details
                    </Link>
                  ) : null}
                </div>
                {s.businesses.ai_summary ? (
                  <p className="mt-2 text-sm text-zinc-700">{s.businesses.ai_summary}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <label className="text-xs text-zinc-500">Move to</label>
                  <select
                    className="rounded border border-zinc-300 px-2 py-1 text-xs"
                    value={s.collection_id ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      void moveSave(
                        s.businesses!.id,
                        v === "" ? null : Number(v),
                      );
                    }}
                  >
                    <option value="">Uncategorized</option>
                    {collections.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            ) : null,
          )}
        </ul>
      )}
    </div>
  );
}
