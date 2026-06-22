"use client";

import { useCallback, useEffect, useState } from "react";

type ReviewItem = {
  id: string;
  type: string;
  status: string;
  business_id: string | null;
  payload: Record<string, unknown>;
  admin_notes: string | null;
  created_at: string;
  businesses: { title: string; slug: string } | null;
};

export function ReviewQueueClient() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/review")
      .then(async (res) => {
        const j = (await res.json()) as { items?: ReviewItem[]; error?: string };
        if (!res.ok) throw new Error(j.error ?? "Failed to load queue");
        setItems(j.items ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, action: "approve" | "reject" | "needs_changes") {
    setActing(id);
    setError(null);
    const res = await fetch(`/api/admin/review/${encodeURIComponent(id)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, admin_notes: notes[id] ?? "" }),
    });
    const j = (await res.json()) as { error?: string };
    setActing(null);
    if (!res.ok) {
      setError(j.error ?? "Action failed");
      return;
    }
    load();
  }

  if (loading) return <p className="text-sm text-zinc-500">Loading review queue…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  const pending = items.filter((i) => i.status === "pending");

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-600">
        {pending.length} pending · {items.length} total (latest 100)
      </p>

      {pending.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600">
          No pending items.
        </p>
      ) : (
        <ul className="space-y-4">
          {pending.map((item) => {
            const title =
              item.businesses?.title ??
              (typeof item.payload.title === "string" ? item.payload.title : null) ??
              (typeof item.payload.business_title === "string" ? item.payload.business_title : null) ??
              item.id;

            return (
              <li key={item.id} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{item.type}</p>
                    <p className="mt-1 font-semibold text-zinc-900">{title}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                  {item.businesses?.slug ? (
                    <a
                      href={`/business/${encodeURIComponent(item.businesses.slug)}`}
                      className="text-sm text-[var(--color-primary)] hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      View listing
                    </a>
                  ) : null}
                </div>

                <dl className="mt-4 space-y-1 text-sm text-zinc-600">
                  {item.type === "edit" && item.payload.changes && typeof item.payload.changes === "object" ? (
                    Object.entries(item.payload.changes as Record<string, unknown>).map(([k, v]) => (
                      <div key={k}>
                        <dt className="inline font-medium text-zinc-800">{k}: </dt>
                        <dd className="inline whitespace-pre-wrap">
                          {typeof v === "object" ? JSON.stringify(v) : String(v)}
                        </dd>
                      </div>
                    ))
                  ) : item.type === "photo" && typeof item.payload.public_url === "string" ? (
                    <div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.payload.public_url}
                        alt=""
                        className="mt-2 max-h-48 rounded-lg border border-zinc-200 object-cover"
                      />
                      {item.payload.is_hero ? (
                        <p className="mt-1 text-xs text-zinc-500">Requested as main photo</p>
                      ) : null}
                    </div>
                  ) : (
                    Object.entries(item.payload).map(([k, v]) =>
                      v != null && v !== "" && k !== "changes" ? (
                        <div key={k}>
                          <dt className="inline font-medium text-zinc-800">{k}: </dt>
                          <dd className="inline">{String(v)}</dd>
                        </div>
                      ) : null,
                    )
                  )}
                </dl>

                <textarea
                  value={notes[item.id] ?? ""}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  placeholder="Optional note to owner (especially on reject)"
                  rows={2}
                  className="mt-4 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                />

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={acting === item.id}
                    onClick={() => act(item.id, "approve")}
                    className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={acting === item.id}
                    onClick={() => act(item.id, "needs_changes")}
                    className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                  >
                    Request changes
                  </button>
                  <button
                    type="button"
                    disabled={acting === item.id}
                    onClick={() => act(item.id, "reject")}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
