"use client";

import { useCallback, useEffect, useState } from "react";

type PhotoRow = {
  id: string;
  public_url: string;
  is_hero: boolean;
  status: string;
};

type Props = {
  businessId: string;
};

/**
 * Inline include/exclude for pending business gallery photos during intake review.
 */
export function AdminBusinessPendingPhotosReview({ businessId }: Props) {
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [included, setIncluded] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/business-photos?business_id=${encodeURIComponent(businessId)}&status=pending`,
      );
      const json = (await res.json()) as { error?: string; photos?: PhotoRow[] };
      if (!res.ok) throw new Error(json.error || "Failed to load photos");
      const rows = json.photos ?? [];
      setPhotos(rows);
      setIncluded(new Set(rows.map((p) => p.id)));
      setLoaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load photos");
      setLoaded(true);
    }
  }, [businessId]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggle(id: string) {
    setIncluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSaved(false);
  }

  async function apply() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/business-photos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: businessId,
          include_photo_ids: [...included],
          pending_photo_ids: photos.map((p) => p.id),
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Failed to apply photo choices");
      setSaved(true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to apply photo choices");
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) {
    return <p className="mt-3 text-xs text-zinc-500">Loading pending photos…</p>;
  }

  if (photos.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-teal-100 bg-teal-50/40 p-3">
      <p className="text-sm font-medium text-zinc-900">
        Pending gallery photos — include to approve, uncheck to exclude
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((photo) => {
          const on = included.has(photo.id);
          return (
            <li key={photo.id}>
              <label className="block cursor-pointer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.public_url}
                  alt=""
                  className={`aspect-[4/3] w-full rounded-lg border border-zinc-200 object-cover ${on ? "" : "opacity-40"}`}
                />
                <span className="mt-1.5 flex items-center gap-2 text-xs text-zinc-800">
                  <input type="checkbox" checked={on} onChange={() => toggle(photo.id)} />
                  {photo.is_hero ? "Include (requested main)" : "Include"}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {saved ? <p className="text-sm text-teal-800">Photo choices saved.</p> : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => void apply()}
        className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        {busy ? "Saving…" : "Apply photo include/exclude"}
      </button>
    </div>
  );
}
