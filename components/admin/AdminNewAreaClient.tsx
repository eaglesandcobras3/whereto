"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type TownOption = { id: string; title: string };

const inputClass =
  "mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10";

export function AdminNewAreaClient() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [townId, setTownId] = useState("");
  const [towns, setTowns] = useState<TownOption[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/guides/options")
      .then(async (res) => {
        const j = (await res.json()) as { towns?: TownOption[] };
        setTowns(j.towns ?? []);
      })
      .catch(() => setTowns([]));
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim() || undefined,
          town_id: townId || null,
        }),
      });
      const j = (await res.json()) as { area?: { id: string }; error?: string };
      if (!res.ok) throw new Error(j.error ?? "Create failed");
      router.push(`/admin/areas/${encodeURIComponent(j.area!.id)}`);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Create failed");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(e) => void create(e)} className="max-w-md space-y-4">
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      <label className="block text-sm font-medium text-zinc-700">
        Title
        <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <label className="block text-sm font-medium text-zinc-700">
        Slug (optional)
        <input className={inputClass} value={slug} onChange={(e) => setSlug(e.target.value)} />
      </label>
      <label className="block text-sm font-medium text-zinc-700">
        Town
        <select className={inputClass} value={townId} onChange={(e) => setTownId(e.target.value)}>
          <option value="">—</option>
          {towns.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {submitting ? "Creating…" : "Create area"}
      </button>
    </form>
  );
}
