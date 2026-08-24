"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ADMIN_SEARCH_DEBOUNCE_MS } from "@/lib/admin/admin-search-debounce";

type TagRow = {
  tag: string;
  description: string | null;
  category_slugs: string[];
};

export function AdminTagsClient() {
  const [tags, setTags] = useState<TagRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [newTag, setNewTag] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
    fetch(`/api/admin/tags${params}`)
      .then(async (res) => {
        const j = (await res.json()) as { tags?: TagRow[]; error?: string };
        if (!res.ok) throw new Error(j.error ?? "Failed to load");
        setTags(j.tags ?? []);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [query]);

  useEffect(() => {
    const t = setTimeout(
      () => queueMicrotask(() => load()),
      query.trim() ? ADMIN_SEARCH_DEBOUNCE_MS : 0,
    );
    return () => clearTimeout(t);
  }, [load, query]);

  async function createTag(e: React.FormEvent) {
    e.preventDefault();
    setSaving("new");
    setErr(null);
    try {
      const res = await fetch("/api/admin/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag: newTag.trim(), description: newDesc.trim() || undefined }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Create failed");
      setNewTag("");
      setNewDesc("");
      load();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Create failed");
    } finally {
      setSaving(null);
    }
  }

  async function saveDescription(tag: string, description: string) {
    setSaving(tag);
    setErr(null);
    try {
      const res = await fetch("/api/admin/tags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag, description }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Save failed");
      load();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Save failed");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-zinc-600">
        Business search tag vocabulary. Guide tags are managed in{" "}
        <Link href="/admin/guides" className="font-medium underline">
          Guides admin
        </Link>
        . Unresolved discover terms:{" "}
        <Link href="/admin/discover-gaps" className="font-medium underline">
          Discover gaps
        </Link>
        .
      </p>

      <form onSubmit={(e) => void createTag(e)} className="space-y-3 rounded-xl border border-zinc-200 p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Add tag</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
            placeholder="tag_slug"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            required
          />
          <input
            className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={saving === "new"}
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving === "new" ? "Adding…" : "Add tag"}
        </button>
      </form>

      <label className="block">
        <span className="text-sm font-medium text-zinc-700">Filter tags</span>
        <input
          type="search"
          className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tag or description"
        />
      </label>

      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {loading ? <p className="text-sm text-zinc-500">Loading tags…</p> : null}

      <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
        {tags.map((row) => (
          <li key={row.tag} className="space-y-2 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-sm font-medium text-zinc-900">{row.tag}</span>
              {row.category_slugs.length ? (
                <span className="text-xs text-zinc-500">{row.category_slugs.join(", ")}</span>
              ) : null}
            </div>
            <div className="flex gap-2">
              <input
                className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                defaultValue={row.description ?? ""}
                placeholder="Description"
                onBlur={(e) => {
                  const next = e.target.value.trim();
                  const prev = (row.description ?? "").trim();
                  if (next !== prev) void saveDescription(row.tag, next);
                }}
              />
              {saving === row.tag ? <span className="text-xs text-zinc-500">Saving…</span> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
