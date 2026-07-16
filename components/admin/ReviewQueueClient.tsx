"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { suggestionToVocabSlug } from "@/lib/listing-requests/apply-suggested-tags";
import {
  FREE_ONBOARD_SEARCH_TAGS_MAX,
  FREE_ONBOARD_TYPES,
  isFreeOnboardReviewType,
} from "@/lib/listing-requests/free-onboard-schema";

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
  return isFreeOnboardReviewType(type);
}

function freeLocations(payload: Record<string, unknown>): FreeLocation[] {
  const raw = payload.locations;
  if (!Array.isArray(raw)) return [];
  return raw.filter((l): l is FreeLocation => l != null && typeof l === "object" && "id" in l);
}

function payloadStringArray(payload: Record<string, unknown>, key: string): string[] {
  const raw = payload[key];
  if (!Array.isArray(raw)) return [];
  return raw.filter((t): t is string => typeof t === "string" && t.trim().length > 0);
}

function previewMergedTags(searchTags: string[], selectedSuggestions: string[]): string[] {
  const merged = [...searchTags];
  const seen = new Set(merged.map((t) => t.toLowerCase()));
  for (const suggestion of selectedSuggestions) {
    const slug = suggestionToVocabSlug(suggestion);
    if (!slug || seen.has(slug)) continue;
    if (merged.length >= FREE_ONBOARD_SEARCH_TAGS_MAX) break;
    merged.push(slug);
    seen.add(slug);
  }
  return merged;
}

export function ReviewQueueClient() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  /** Suggested tag phrases selected for promote+apply, keyed by review item id. */
  const [promoteByItem, setPromoteByItem] = useState<Record<string, string[]>>({});
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
        service_category_id: "",
        search_tags: [],
        suggested_tags: [],
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
        const nextItems = j.items ?? [];
        setItems(nextItems);
        setPromoteByItem((prev) => {
          const next = { ...prev };
          for (const item of nextItems) {
            if (next[item.id] !== undefined) continue;
            next[item.id] = payloadStringArray(item.payload, "suggested_tags");
          }
          return next;
        });
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

  function togglePromote(itemId: string, suggestion: string, checked: boolean) {
    setPromoteByItem((prev) => {
      const current = prev[itemId] ?? [];
      const key = suggestion.toLowerCase();
      const without = current.filter((s) => s.toLowerCase() !== key);
      return {
        ...prev,
        [itemId]: checked ? [...without, suggestion] : without,
      };
    });
  }

  async function act(
    id: string,
    action: string,
    extra?: { location_id?: string },
  ) {
    setActing(id);
    setError(null);
    const shouldApplyTags =
      action === "approve" ||
      action === "approve_all_locations" ||
      action === "create_location";
    const res = await fetch(`/api/admin/review/${encodeURIComponent(id)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        admin_notes: notes[id] ?? "",
        ...(shouldApplyTags ? { apply_suggested_tags: promoteByItem[id] ?? [] } : {}),
        ...extra,
      }),
    });
    const j = (await res.json()) as { error?: string };
    setActing(null);
    if (!res.ok) {
      setError(j.error ?? "Action failed");
      return;
    }
    setPromoteByItem((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    const scrollToTop =
      action === "approve" || action === "approve_all_locations";
    if (scrollToTop) {
      window.scrollTo({ top: 0, behavior: "smooth" });
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
      ) : view === "completed" ? (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <ul className="divide-y divide-zinc-100">
            {visible.map((item) => {
              const title =
                item.businesses?.title ??
                (typeof item.payload.title === "string" ? item.payload.title : null) ??
                (typeof item.payload.business_title === "string"
                  ? item.payload.business_title
                  : null) ??
                item.id;
              const submitterEmail =
                typeof item.payload.submitter_email === "string"
                  ? item.payload.submitter_email
                  : null;
              const isApproved = item.status === "approved";

              return (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm hover:bg-zinc-50"
                >
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                      isApproved
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {item.status}
                  </span>
                  <span className="min-w-0 flex-1 font-medium text-zinc-900">{title}</span>
                  <span className="shrink-0 text-xs text-zinc-500">{item.type}</span>
                  {submitterEmail ? (
                    <span className="shrink-0 text-xs text-zinc-500">{submitterEmail}</span>
                  ) : null}
                  <span className="shrink-0 text-xs text-zinc-400">
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                  {item.businesses?.slug ? (
                    <a
                      href={`/business/${encodeURIComponent(item.businesses.slug)}`}
                      className="shrink-0 text-xs text-[var(--color-primary)] hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      View listing
                    </a>
                  ) : null}
                  {item.admin_notes ? (
                    <span
                      className="w-full text-xs text-zinc-500"
                      title={item.admin_notes}
                    >
                      Note: {item.admin_notes}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
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
                    {item.type === FREE_ONBOARD_TYPES.removal ? (
                      <>
                        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950">
                          Removal request — approving will archive this listing (hide from the public
                          site). Confirm the submitter is an authorized owner before approving.
                        </p>
                        <p className="whitespace-pre-wrap">
                          <span className="font-medium text-zinc-800">Reason:</span>{" "}
                          {String(item.payload.reason ?? "—")}
                        </p>
                      </>
                    ) : (
                      <>
                        <p>
                          <span className="font-medium text-zinc-800">Excerpt:</span>{" "}
                          {String(item.payload.excerpt ?? "")}
                        </p>
                        <p className="whitespace-pre-wrap">
                          <span className="font-medium text-zinc-800">Overview:</span>{" "}
                          {String(item.payload.overview ?? "")}
                        </p>
                        <p>
                          <span className="font-medium text-zinc-800">
                            {item.payload.is_service_business ? "Specialty:" : "Category:"}
                          </span>{" "}
                          {item.payload.is_service_business
                            ? String(
                                item.payload.service_category_title ??
                                  item.payload.service_category_id ??
                                  "",
                              )
                            : String(item.payload.category_title ?? item.payload.category_id ?? "")}
                        </p>
                        <p>
                          <span className="font-medium text-zinc-800">Search tags:</span>{" "}
                          {payloadStringArray(item.payload, "search_tags").join(", ") || "—"}
                        </p>
                        {(() => {
                          const suggested = payloadStringArray(item.payload, "suggested_tags");
                          const searchTags = payloadStringArray(item.payload, "search_tags");
                          const selected = promoteByItem[item.id] ?? suggested;
                          const preview = previewMergedTags(searchTags, selected);
                          if (suggested.length === 0) {
                            return (
                              <p>
                                <span className="font-medium text-zinc-800">Suggested tags:</span> —
                              </p>
                            );
                          }
                          return (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950">
                              <p className="font-medium text-zinc-800">Suggested tags</p>
                              <p className="mt-1 text-xs text-amber-900">
                                Check tags to add to the vocabulary and apply on the listing when you
                                approve (max {FREE_ONBOARD_SEARCH_TAGS_MAX} total with search tags).
                                Unchecked stay unused.
                              </p>
                              <ul className="mt-2 space-y-1.5">
                                {suggested.map((suggestion) => {
                                  const slug = suggestionToVocabSlug(suggestion);
                                  const checked = selected.some(
                                    (s) => s.toLowerCase() === suggestion.toLowerCase(),
                                  );
                                  return (
                                    <li key={suggestion}>
                                      <label className="flex cursor-pointer items-start gap-2 text-sm">
                                        <input
                                          type="checkbox"
                                          className="mt-0.5"
                                          checked={checked}
                                          onChange={(e) =>
                                            togglePromote(item.id, suggestion, e.target.checked)
                                          }
                                        />
                                        <span>
                                          <span className="font-medium">{suggestion}</span>
                                          {slug ? (
                                            <span className="ml-1 text-xs text-zinc-600">
                                              → {slug}
                                            </span>
                                          ) : (
                                            <span className="ml-1 text-xs text-red-700">
                                              (invalid — cannot promote)
                                            </span>
                                          )}
                                        </span>
                                      </label>
                                    </li>
                                  );
                                })}
                              </ul>
                              <p className="mt-2 text-xs text-zinc-700">
                                <span className="font-medium">On approve:</span>{" "}
                                {preview.length > 0 ? preview.join(", ") : "—"}
                                {preview.length >= FREE_ONBOARD_SEARCH_TAGS_MAX
                                  ? ` (${FREE_ONBOARD_SEARCH_TAGS_MAX}-tag cap)`
                                  : ""}
                              </p>
                            </div>
                          );
                        })()}
                        <p>
                          <span className="font-medium text-zinc-800">Search keywords (auto):</span>{" "}
                          {String(item.payload.search_keywords ?? "—")}
                        </p>

                        <div className="space-y-2">
                          <p className="font-medium text-zinc-800">
                            Locations — create one listing per location (pending until all are
                            handled)
                          </p>
                          {locations.length === 0 ? (
                            <p className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
                              Service business — no town/address rows. Approve all creates one
                              listing without a storefront address.
                            </p>
                          ) : null}
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
                              {loc.status === "pending" ? (
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    disabled={acting === item.id}
                                    onClick={() =>
                                      void act(item.id, "create_location", {
                                        location_id: loc.id,
                                      })
                                    }
                                    className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                                  >
                                    Create listing
                                  </button>
                                  <button
                                    type="button"
                                    disabled={acting === item.id}
                                    onClick={() =>
                                      void act(item.id, "skip_location", {
                                        location_id: loc.id,
                                      })
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
                      </>
                    )}
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
                            item.type === FREE_ONBOARD_TYPES.update ||
                              item.type === FREE_ONBOARD_TYPES.removal
                              ? "approve"
                              : "approve_all_locations",
                          )
                        }
                        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                      >
                        {item.type === FREE_ONBOARD_TYPES.removal
                          ? "Approve removal (archive)"
                          : item.type === FREE_ONBOARD_TYPES.update
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
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
