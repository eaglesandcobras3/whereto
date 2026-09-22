"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CommunityTipPlantForm } from "@/components/admin/CommunityTipPlantForm";
import { TipInitialsAvatar } from "@/components/community-tips/TipInitialsAvatar";
import { tipAttributionSaid } from "@/lib/community-tips/attribution";
import { DEFAULT_PLANT_WINDOW_DAYS } from "@/lib/community-tips/schedule";
import type { CommunityTipAdminListStatus } from "@/lib/community-tips/schema";

type AdminTip = {
  id: string;
  entity_type: string;
  entity_id: string;
  body: string;
  rating: number | null;
  attribution_city: string | null;
  attribution_name?: string | null;
  status: string;
  created_at: string;
  entity_title: string | null;
  entity_href: string | null;
  is_planted?: boolean;
};

const LIST_STATUSES: CommunityTipAdminListStatus[] = [
  "pending",
  "scheduled",
  "published",
  "rejected",
  "hidden",
];

export function CommunityTipsAdminClient() {
  const [status, setStatus] = useState<CommunityTipAdminListStatus>("pending");
  const [items, setItems] = useState<AdminTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [windowDays, setWindowDays] = useState(DEFAULT_PLANT_WINDOW_DAYS);

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

  async function act(
    id: string,
    action: "publish" | "reject" | "hide" | "delete",
    schedule?: "now" | "random_future",
  ) {
    setBusyId(id);
    const res = await fetch("/api/admin/community-tips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        action,
        schedule,
        window_days: schedule === "random_future" ? windowDays : undefined,
      }),
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
      <CommunityTipPlantForm
        onPlanted={(result) => {
          const next = result.schedule === "now" ? "published" : "scheduled";
          if (status === next) void load();
          else setStatus(next);
        }}
      />

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {LIST_STATUSES.map((s) => (
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
        <label className="ml-auto text-xs text-zinc-500">
          Random window
          <select
            value={windowDays}
            onChange={(e) => setWindowDays(Number(e.target.value))}
            className="ml-2 rounded-md border border-zinc-300 px-2 py-1 text-sm text-zinc-800"
          >
            {[1, 3, 7, 14, 30].map((d) => (
              <option key={d} value={d}>
                {d}d
              </option>
            ))}
          </select>
        </label>
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
              <div className="flex gap-3">
                <TipInitialsAvatar name={item.attribution_name} city={item.attribution_city} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                    {item.is_planted ? "Planted · " : "Tip · "}
                    {tipAttributionSaid(item.attribution_city, item.attribution_name)}
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
                </div>
              </div>
              <p className="mt-2 text-xs text-zinc-400">
                {status === "scheduled" ? "Goes live " : "Stamped "}
                {new Date(item.created_at).toLocaleString()}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {status === "pending" ? (
                  <>
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => void act(item.id, "publish", "now")}
                      className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                    >
                      Publish now
                    </button>
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => void act(item.id, "publish", "random_future")}
                      className="rounded-lg bg-teal-700 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                    >
                      Publish later (random)
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
                {status === "published" || status === "scheduled" ? (
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
