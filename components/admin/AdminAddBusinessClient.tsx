"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { OptionTypeahead } from "@/components/admin/OptionTypeahead";

type TownOption = { id: string; title: string; slug: string };
type AreaOption = { id: string; title: string; slug: string | null; town_id: string | null };

type QueueItem = {
  id: string;
  title: string;
  town: string;
  area: string;
  town_id: string | null;
  area_id: string | null;
  is_storefront: boolean;
  is_service_business: boolean;
  status: string;
  audit_status: string | null;
  audit_confidence: string | null;
  audit_notes: string | null;
  business_id: string | null;
  business_slug: string | null;
  result_reason: string | null;
  created_at: string;
};

const inputClass =
  "w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10";
const labelClass = "block text-sm font-medium text-zinc-700";

export function AdminAddBusinessClient() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, setPending] = useState<QueueItem[]>([]);
  const [needsReview, setNeedsReview] = useState<QueueItem[]>([]);
  const [towns, setTowns] = useState<TownOption[]>([]);
  const [areas, setAreas] = useState<AreaOption[]>([]);

  const [title, setTitle] = useState("");
  const [townId, setTownId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [isStorefront, setIsStorefront] = useState(false);
  const [isService, setIsService] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyProgress, setApplyProgress] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/business-seed-queue");
      const j = (await res.json()) as {
        pending?: QueueItem[];
        needsReview?: QueueItem[];
        options?: { towns?: TownOption[]; areas?: AreaOption[] };
        error?: string;
      };
      if (!res.ok) throw new Error(j.error ?? "Failed to load queue");
      setPending(j.pending ?? []);
      setNeedsReview(j.needsReview ?? []);
      setTowns(j.options?.towns ?? []);
      setAreas(j.options?.areas ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const serviceOnly = isService && !isStorefront;

  const areasForTown = useMemo(() => {
    if (serviceOnly) return [];
    if (!townId) return areas;
    return areas.filter((a) => !a.town_id || a.town_id === townId);
  }, [areas, townId, serviceOnly]);

  const townOptions = useMemo(
    () => towns.map((t) => ({ id: t.id, title: t.title, subtitle: t.slug })),
    [towns],
  );
  const areaOptions = useMemo(
    () => areasForTown.map((a) => ({ id: a.id, title: a.title, subtitle: a.slug })),
    [areasForTown],
  );

  useEffect(() => {
    if (serviceOnly) {
      setTownId("");
      setAreaId("");
    }
  }, [serviceOnly]);

  async function enqueue(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    setOk(null);

    const town = towns.find((t) => t.id === townId);
    const area = areas.find((a) => a.id === areaId);

    try {
      const res = await fetch("/api/admin/business-seed-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          town: serviceOnly ? "" : (town?.title ?? ""),
          area: serviceOnly ? "" : (area?.title ?? ""),
          town_id: serviceOnly ? null : townId || null,
          area_id: serviceOnly ? null : areaId || null,
          is_storefront: isStorefront,
          is_service_business: isService,
        }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Could not add to queue");
      setTitle("");
      setTownId("");
      setAreaId("");
      setIsStorefront(false);
      setIsService(false);
      setOk("Added to import queue");
      await load();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not add to queue");
    } finally {
      setSubmitting(false);
    }
  }

  async function applyAll() {
    if (pending.length === 0) return;
    setApplying(true);
    setErr(null);
    setOk(null);
    let imported = 0;
    let review = 0;
    try {
      for (let i = 0; i < pending.length; i++) {
        const item = pending[i];
        setApplyProgress(`Applying ${i + 1}/${pending.length}: ${item.title}`);
        const res = await fetch("/api/admin/business-seed-queue/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id }),
        });
        const j = (await res.json()) as { outcome?: string; error?: string };
        if (!res.ok) throw new Error(j.error ?? `Failed on ${item.title}`);
        if (j.outcome === "imported" || j.outcome === "duplicate") imported += 1;
        else review += 1;
      }
      setOk(`Apply finished: ${imported} imported, ${review} need review`);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Apply failed");
      await load();
    } finally {
      setApplying(false);
      setApplyProgress(null);
    }
  }

  async function forceApply(id: string) {
    setActionId(id);
    setErr(null);
    try {
      const res = await fetch("/api/admin/business-seed-queue/force-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const j = (await res.json()) as { error?: string; businessSlug?: string };
      if (!res.ok) throw new Error(j.error ?? "Force apply failed");
      setOk(j.businessSlug ? `Force-imported as ${j.businessSlug}` : "Force-imported");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Force apply failed");
    } finally {
      setActionId(null);
    }
  }

  async function tryAgain(id: string) {
    setActionId(id);
    setErr(null);
    try {
      const res = await fetch("/api/admin/business-seed-queue/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Try again failed");
      setOk("Moved back to pending queue");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Try again failed");
    } finally {
      setActionId(null);
    }
  }

  async function skip(id: string) {
    setActionId(id);
    setErr(null);
    try {
      const res = await fetch("/api/admin/business-seed-queue/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Skip failed");
      setOk("Skipped");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Skip failed");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="space-y-10">
      <form onSubmit={(e) => void enqueue(e)} className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="font-headline text-lg font-semibold text-zinc-900">Add to import queue</h2>
        <p className="text-sm text-zinc-600">
          Same five fields as the seed CSV. Apply runs Gemini verify + Census pin + insert for pending rows.
          Service-only listings leave town/area blank (serve any area).
        </p>

        <label className={labelClass}>
          Business name
          <input
            className={`${inputClass} mt-1`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={submitting}
          />
        </label>

        <fieldset className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
          <legend className={`${labelClass} px-1`}>How does it operate?</legend>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-800">
            <input
              type="checkbox"
              className="mt-1"
              checked={isStorefront}
              onChange={(e) => setIsStorefront(e.target.checked)}
              disabled={submitting}
            />
            <span>Storefront or fixed public location customers visit</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-800">
            <input
              type="checkbox"
              className="mt-1"
              checked={isService}
              onChange={(e) => setIsService(e.target.checked)}
              disabled={submitting}
            />
            <span>Service business (mobile, by appointment, or wider area)</span>
          </label>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <OptionTypeahead
            label={serviceOnly ? "Town (not used for service-only)" : "Town"}
            options={townOptions}
            value={townId}
            onChange={(id) => {
              setTownId(id);
              setAreaId("");
            }}
            disabled={submitting || serviceOnly}
            placeholder={serviceOnly ? "Any area" : "Search towns…"}
            allowClear
            inputClassName={inputClass}
            labelClassName={labelClass}
          />
          <OptionTypeahead
            label={serviceOnly ? "Area (not used for service-only)" : "Area"}
            options={areaOptions}
            value={areaId}
            onChange={setAreaId}
            disabled={submitting || serviceOnly || !townId}
            placeholder={serviceOnly ? "—" : townId ? "Search areas…" : "Choose town first"}
            allowClear
            inputClassName={inputClass}
            labelClassName={labelClass}
          />
        </div>

        <button
          type="submit"
          disabled={submitting || loading}
          className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {submitting ? "Adding…" : "Add to queue"}
        </button>
      </form>

      {err ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {err}
        </p>
      ) : null}
      {ok ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
          {ok}
        </p>
      ) : null}
      {applyProgress ? <p className="text-sm text-zinc-600">{applyProgress}</p> : null}

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-headline text-lg font-semibold text-zinc-900">
            Pending queue ({pending.length})
          </h2>
          <button
            type="button"
            onClick={() => void applyAll()}
            disabled={applying || pending.length === 0}
            className="rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
          >
            {applying ? "Applying…" : "Apply queue"}
          </button>
        </div>
        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : pending.length === 0 ? (
          <p className="text-sm text-zinc-500">No pending businesses.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white">
            {pending.map((item) => (
              <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium text-zinc-900">{item.title}</p>
                  <p className="text-xs text-zinc-500">
                    {[item.is_storefront ? "storefront" : null, item.is_service_business ? "service" : null]
                      .filter(Boolean)
                      .join(" · ")}
                    {item.town ? ` · ${item.town}` : " · any area"}
                    {item.area ? ` / ${item.area}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-xs font-medium text-zinc-500 hover:text-zinc-800"
                  disabled={actionId === item.id || applying}
                  onClick={() => void skip(item.id)}
                >
                  Skip
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-headline text-lg font-semibold text-zinc-900">
          Needs review ({needsReview.length})
        </h2>
        <p className="text-sm text-zinc-600">
          Gemini could not confirm these. Try again moves the row back to the pending queue for a fresh apply;
          force apply inserts with available enrichment; skip removes them from the queue.
        </p>
        {needsReview.length === 0 ? (
          <p className="text-sm text-zinc-500">Nothing awaiting review.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-2xl border border-amber-200 bg-amber-50/40">
            {needsReview.map((item) => (
              <li key={item.id} className="px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-zinc-900">{item.title}</p>
                    <p className="text-xs text-zinc-600">
                      status={item.audit_status || "—"}
                      {item.audit_confidence ? ` · ${item.audit_confidence}` : ""}
                    </p>
                    {item.result_reason || item.audit_notes ? (
                      <p className="mt-1 text-xs text-zinc-500">
                        {item.result_reason || item.audit_notes}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-full bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
                      disabled={actionId === item.id || applying}
                      onClick={() => void tryAgain(item.id)}
                    >
                      Try again
                    </button>
                    <button
                      type="button"
                      className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      disabled={actionId === item.id}
                      onClick={() => void forceApply(item.id)}
                    >
                      Force apply
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 disabled:opacity-50"
                      disabled={actionId === item.id}
                      onClick={() => void skip(item.id)}
                    >
                      Skip
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-sm text-zinc-500">
        <Link href="/admin" className="font-medium text-zinc-700 underline hover:text-zinc-900">
          Back to admin
        </Link>
      </p>
    </div>
  );
}
