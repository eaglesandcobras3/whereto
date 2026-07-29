"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { tipAttributionSaid } from "@/lib/community-tips/attribution";

type AdminTip = {
  id: string;
  entity_type: string;
  entity_id: string;
  body: string;
  rating: number | null;
  attribution_city: string | null;
  status: string;
  created_at: string;
  entity_title: string | null;
  entity_href: string | null;
};

export function CommunityTipsAdminClient() {
  const [status, setStatus] = useState("pending");
  const [items, setItems] = useState<AdminTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/admin/community-tips?status=${encodeURIComponent(status)}`);
    if (!res.ok) {
      setError("Could not load tips.");
      setLoading(false);
      return;
    }
    const json = (await res.json()) as { items?: AdminTip[] };
    setItems(json.items ?? []);
    setLoading(false);
  }, [status]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function act(id: string, action: "publish" | "reject" | "hide" | "delete") {
    setBusyId(id);
    const res = await fetch("/api/admin/community-tips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    setBusyId(null);
    if (!res.ok) {
      setError("Action failed.");
      return;
    }
    void load();
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {(["pending", "published", "rejected", "hidden"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              status === s
                ? "bg-zinc-900 text-white"
                : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <p className="mt-6 text-sm text-zinc-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500">No {status} tips.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                Tip · {tipAttributionSaid(item.attribution_city)}
                {item.rating != null ? ` · ${item.rating}★` : ""}
              </p>
              {item.entity_href && item.entity_title ? (
                <Link
                  href={item.entity_href}
                  className="mt-1 inline-block font-medium text-teal-800 hover:underline"
                >
                  {item.entity_title}
                </Link>
              ) : (
                <p className="mt-1 font-medium text-zinc-800">
                  {item.entity_title || `${item.entity_type} ${item.entity_id.slice(0, 8)}…`}
                </p>
              )}
              <p className="mt-2 text-sm text-zinc-700">{item.body}</p>
              <p className="mt-2 text-xs text-zinc-400">
                {new Date(item.created_at).toLocaleString()}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {status === "pending" ? (
                  <>
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => void act(item.id, "publish")}
                      className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                    >
                      Publish
                    </button>
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => void act(item.id, "reject")}
                      className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </>
                ) : null}
                {status === "published" ? (
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => void act(item.id, "hide")}
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm disabled:opacity-50"
                  >
                    Hide
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => void act(item.id, "delete")}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
