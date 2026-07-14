"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FREE_ONBOARD_TYPES } from "@/lib/listing-requests/free-onboard-schema";

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

type FreeLocation = {
  id: string;
  town_id: string;
  town_title?: string | null;
  address: string | null;
  status: string;
  resulting_business_id?: string | null;
  resulting_business_slug?: string | null;
};

function isFreeType(type: string) {
  return type === FREE_ONBOARD_TYPES.newListing || type === FREE_ONBOARD_TYPES.update;
}

function freeLocations(payload: Record<string, unknown>): FreeLocation[] {
  const raw = payload.locations;
  if (!Array.isArray(raw)) return [];
  return raw.filter((l): l is FreeLocation => l != null && typeof l === "object" && "id" in l);
}

export function ReviewQueueClient() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [view, setView] = useState<"pending" | "completed">("pending");
  const [showManual, setShowManual] = useState(false);
  const [manualJson, setManualJson] = useState(
    JSON.stringify(
      {
        submitter_name: "Admin",
        submitter_email: "hello@whereto30a.com",
        title: "",
        is_storefront: true,
        is_service_business: false,
        locations: [{ town_id: "", address: "" }],
        website: "",
        phone: "",
        excerpt: "",
        overview: "",
        category_id: "",
        search_tags: [],
        search_keywords: "",
        marketing_opt_in: false,
        target_business_id: null,
      },
      null,
      2,
    ),
  );

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
    queueMicrotask(() => load());
  }, [load]);

  const visible = useMemo(() => {
    if (view === "pending") return items.filter((i) => i.status === "pending");
    return items.filter((i) => i.status === "approved" || i.status === "rejected");
  }, [items, view]);

  async function act(
    id: string,
    action: string,
    extra?: { location_id?: string },
  ) {
    setActing(id);
    setError(null);
    const res = await fetch(`/api/admin/review/${encodeURIComponent(id)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        admin_notes: notes[id] ?? "",
        ...extra,
      }),
    });
    const j = (await res.json()) as { error?: string };
    setActing(null);
    if (!res.ok) {
      setError(j.error ?? "Action failed");
      return;
    }
    load();
  }

  async function submitManual() {
    setError(null);
    let body: unknown;
    try {
      body = JSON.parse(manualJson) as unknown;
    } catch {
      setError("Manual form JSON is invalid");
      return;
    }
    setActing("manual");
    const res = await fetch("/api/admin/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = (await res.json()) as { error?: string };
    setActing(null);
    if (!res.ok) {
      setError(j.error ?? "Could not add to queue");
      return;
    }
    setShowManual(false);
    setView("pending");
    load();
  }

  if (loading) return <p className="text-sm text-zinc-500">Loading review queue…</p>;

  const pendingCount = items.filter((i) => i.status === "pending").length;
  const completedCount = items.filter(
    (i) => i.status === "approved" || i.status === "rejected",
  ).length;

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-1 text-sm">
          <button
            type="button"
            onClick={() => setView("pending")}
            className={`rounded-md px-3 py-1.5 ${
              view === "pending" ? "bg-white font-medium text-zinc-900 shadow-sm" : "text-zinc-600"
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setView("completed")}
            className={`rounded-md px-3 py-1.5 ${
              view === "completed" ? "bg-white font-medium text-zinc-900 shadow-sm" : "text-zinc-600"
            }`}
          >
            Approved / not approved ({completedCount})
          </button>
        </div>
        <button
          type="button"
          onClick={() => setShowManual((v) => !v)}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          {showManual ? "Hide manual add" : "Manually add to queue"}
        </button>
      </div>

      {showManual ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-zinc-600">
            Paste free intake JSON (same shape as the public form). Requires real town and category UUIDs.
          </p>
          <textarea
            value={manualJson}
            onChange={(e) => setManualJson(e.target.value)}
            rows={16}
            className="mt-3 w-full rounded-lg border border-zinc-200 px-3 py-2 font-mono text-xs"
          />
          <button
            type="button"
            disabled={acting === "manual"}
            onClick={() => void submitManual()}
            className="mt-3 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            Add to queue
          </button>
        </div>
      ) : null}

      {visible.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600">
          {view === "pending" ? "No pending items." : "No completed items in the latest 100."}
        </p>
      ) : (
        <ul className="space-y-4">
          {visible.map((item) => {
            const title =
              item.businesses?.title ??
              (typeof item.payload.title === "string" ? item.payload.title : null) ??
              (typeof item.payload.business_title === "string"
                ? item.payload.business_title
                : null) ??
              item.id;
            const free = isFreeType(item.type);
            const locations = free ? freeLocations(item.payload) : [];

            return (
              <li key={item.id} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      {item.type} · {item.status}
                    </p>
                    <p className="mt-1 font-semibold text-zinc-900">{title}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                    {typeof item.payload.marketing_opt_in === "boolean" ? (
                      <p className="mt-1 text-xs text-zinc-500">
                        Marketing opt-in: {item.payload.marketing_opt_in ? "yes" : "no"}
                      </p>
                    ) : null}
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

                {free ? (
                  <div className="mt-4 space-y-3 text-sm text-zinc-600">
                    <p>
                      <span className="font-medium text-zinc-800">Submitter:</span>{" "}
                      {String(item.payload.submitter_name ?? "")} &lt;
                      {String(item.payload.submitter_email ?? "")}&gt;
                    </p>
                    <p>
                      <span className="font-medium text-zinc-800">Excerpt:</span>{" "}
                      {String(item.payload.excerpt ?? "")}
                    </p>
                    <p className="whitespace-pre-wrap">
                      <span className="font-medium text-zinc-800">Overview:</span>{" "}
                      {String(item.payload.overview ?? "")}
                    </p>
                    <p>
                      <span className="font-medium text-zinc-800">Category:</span>{" "}
                      {String(item.payload.category_title ?? item.payload.category_id ?? "")}
                    </p>
                    <p>
                      <span className="font-medium text-zinc-800">Search tags:</span>{" "}
                      {Array.isArray(item.payload.search_tags)
                        ? (item.payload.search_tags as string[]).join(", ")
                        : "—"}
                    </p>
                    <p>
                      <span className="font-medium text-zinc-800">Search keywords:</span>{" "}
                      {String(item.payload.search_keywords ?? "—")}
                    </p>

                    <div className="space-y-2">
                      <p className="font-medium text-zinc-800">
                        Locations — create one listing per location (pending until all are handled)
                      </p>
                      {locations.map((loc) => (
                        <div
                          key={loc.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2"
                        >
                          <div>
                            <p className="font-medium text-zinc-900">
                              {loc.town_title ?? loc.town_id}
                              {loc.address ? ` — ${loc.address}` : ""}
                            </p>
                            <p className="text-xs text-zinc-500">status: {loc.status}</p>
                            {loc.resulting_business_slug ? (
                              <a
                                href={`/business/${encodeURIComponent(loc.resulting_business_slug)}`}
                                className="text-xs text-[var(--color-primary)] hover:underline"
                                target="_blank"
                                rel="noreferrer"
                              >
                                Open created listing
                              </a>
                            ) : null}
                          </div>
                          {item.status === "pending" && loc.status === "pending" ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={acting === item.id}
                                onClick={() =>
                                  void act(item.id, "create_location", { location_id: loc.id })
                                }
                                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                              >
                                Create listing
                              </button>
                              <button
                                type="button"
                                disabled={acting === item.id}
                                onClick={() =>
                                  void act(item.id, "skip_location", { location_id: loc.id })
                                }
                                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 disabled:opacity-50"
                              >
                                Skip
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <dl className="mt-4 space-y-1 text-sm text-zinc-600">
                    {item.type === "edit" &&
                    item.payload.changes &&
                    typeof item.payload.changes === "object" ? (
                      Object.entries(item.payload.changes as Record<string, unknown>).map(
                        ([k, v]) => (
                          <div key={k}>
                            <dt className="inline font-medium text-zinc-800">{k}: </dt>
                            <dd className="inline whitespace-pre-wrap">
                              {typeof v === "object" ? JSON.stringify(v) : String(v)}
                            </dd>
                          </div>
                        ),
                      )
                    ) : item.type === "photo" && typeof item.payload.public_url === "string" ? (
                      <div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.payload.public_url}
                          alt=""
                          className="mt-2 max-h-48 rounded-lg border border-zinc-200 object-cover"
                        />
                      </div>
                    ) : (
                      Object.entries(item.payload).map(([k, v]) =>
                        v != null && v !== "" && k !== "changes" && k !== "locations" ? (
                          <div key={k}>
                            <dt className="inline font-medium text-zinc-800">{k}: </dt>
                            <dd className="inline">
                              {typeof v === "object" ? JSON.stringify(v) : String(v)}
                            </dd>
                          </div>
                        ) : null,
                      )
                    )}
                  </dl>
                )}

                {item.status === "pending" ? (
                  <>
                    <textarea
                      value={notes[item.id] ?? ""}
                      onChange={(e) =>
                        setNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                      placeholder="Optional note (especially on reject)"
                      rows={2}
                      className="mt-4 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                    />

                    <div className="mt-3 flex flex-wrap gap-2">
                      {free ? (
                        <>
                          <button
                            type="button"
                            disabled={acting === item.id}
                            onClick={() =>
                              void act(
                                item.id,
                                item.type === FREE_ONBOARD_TYPES.update
                                  ? "approve"
                                  : "approve_all_locations",
                              )
                            }
                            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                          >
                            {item.type === FREE_ONBOARD_TYPES.update
                              ? "Approve update (+ extra locations)"
                              : "Approve all locations"}
                          </button>
                          <button
                            type="button"
                            disabled={acting === item.id}
                            onClick={() => void act(item.id, "reject")}
                            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                          >
                            Not approve / reject
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={acting === item.id}
                            onClick={() => void act(item.id, "approve")}
                            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={acting === item.id}
                            onClick={() => void act(item.id, "needs_changes")}
                            className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                          >
                            Request changes
                          </button>
                          <button
                            type="button"
                            disabled={acting === item.id}
                            onClick={() => void act(item.id, "reject")}
                            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </>
                ) : item.admin_notes ? (
                  <p className="mt-3 text-sm text-zinc-500">Note: {item.admin_notes}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
