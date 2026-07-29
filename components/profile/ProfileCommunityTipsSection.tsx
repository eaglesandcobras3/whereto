"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { entityTypeLabel, tipAttributionSaid } from "@/lib/community-tips/attribution";
import type { OwnCommunityTip } from "@/lib/community-tips/schema";
import { useCommunityTipsFeatureEnabled } from "@/lib/feature-flags-client-utils";

function statusLabel(status: OwnCommunityTip["status"]): string {
  switch (status) {
    case "pending":
      return "Awaiting review";
    case "published":
      return "Published";
    case "rejected":
      return "Not approved";
    case "hidden":
      return "Hidden";
    default:
      return status;
  }
}

export function ProfileCommunityTipsSection() {
  const enabled = useCommunityTipsFeatureEnabled();
  const [tips, setTips] = useState<OwnCommunityTip[]>([]);
  const [city, setCity] = useState("");
  const [citySaved, setCitySaved] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [tipsRes, cityRes] = await Promise.all([
      fetch("/api/community-tips?mine=1"),
      fetch("/api/profile/attribution-city"),
    ]);
    if (tipsRes.ok) {
      const json = (await tipsRes.json()) as { tips?: OwnCommunityTip[] };
      setTips(json.tips ?? []);
    }
    if (cityRes.ok) {
      const json = (await cityRes.json()) as { attribution_city?: string | null };
      setCity(json.attribution_city?.trim() ?? "");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void load();
  }, [enabled, load]);

  if (!enabled) return null;

  async function saveCity(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setCitySaved(false);
    const res = await fetch("/api/profile/attribution-city", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attribution_city: city }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setMessage(json.error || "Could not save city.");
      return;
    }
    setCitySaved(true);
  }

  async function saveEdit(id: string) {
    setMessage("");
    const res = await fetch("/api/community-tips", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, body: editBody }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setMessage(json.error || "Could not update.");
      return;
    }
    setEditingId(null);
    setMessage("Updated — back in the review queue.");
    void load();
  }

  async function removeTip(id: string) {
    if (!confirm("Delete this tip?")) return;
    const res = await fetch(`/api/community-tips?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setMessage("Could not delete.");
      return;
    }
    void load();
  }

  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
        Your tips
      </h2>
      <p className="mt-2 text-sm text-zinc-500">
        Public pages show “{tipAttributionSaid(city || "…")}” — never your name or email.
      </p>

      <form onSubmit={saveCity} className="mt-4 flex flex-wrap items-end gap-2">
        <label className="block text-sm text-zinc-600">
          City you’re from
          <input
            required
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              setCitySaved(false);
            }}
            placeholder="e.g. Birmingham"
            className="mt-1 block w-56 rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          Save city
        </button>
        {citySaved ? <span className="text-sm text-emerald-700">Saved</span> : null}
      </form>

      {loading ? (
        <p className="mt-4 text-sm text-zinc-500">Loading…</p>
      ) : tips.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">You haven’t left any tips yet.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {tips.map((tip) => (
            <li key={tip.id} className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                    {entityTypeLabel(tip.entity_type)} · {statusLabel(tip.status)}
                  </p>
                  {tip.entity_href && tip.entity_title ? (
                    <Link
                      href={tip.entity_href}
                      className="mt-1 font-medium text-teal-800 hover:underline"
                    >
                      {tip.entity_title}
                    </Link>
                  ) : (
                    <p className="mt-1 font-medium text-zinc-800">{tip.entity_title || "Place"}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-sm text-teal-700 hover:underline"
                    onClick={() => {
                      setEditingId(tip.id);
                      setEditBody(tip.body);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-sm text-red-600 hover:underline"
                    onClick={() => void removeTip(tip.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              {editingId === tip.id ? (
                <div className="mt-3 space-y-2">
                  <textarea
                    rows={3}
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void saveEdit(tip.id)}
                      className="rounded-lg bg-teal-700 px-3 py-1.5 text-sm text-white"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-zinc-700">{tip.body}</p>
              )}
            </li>
          ))}
        </ul>
      )}
      {message ? <p className="mt-3 text-sm text-zinc-600">{message}</p> : null}
    </section>
  );
}
