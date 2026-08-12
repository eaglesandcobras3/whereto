"use client";

import { useState } from "react";
import type { FreeOnboardPhotoPayload } from "@/lib/listing-requests/free-onboard-schema";

type Props = {
  itemId: string;
  photos: FreeOnboardPhotoPayload[];
  onSaved?: () => void;
};

/**
 * Include/exclude free-intake payload photos before a new listing is approved
 * (no business_id yet — rows live only on the review payload).
 */
export function AdminFreeOnboardPayloadPhotosReview({ itemId, photos, onSaved }: Props) {
  const [included, setIncluded] = useState<Set<string>>(
    () =>
      new Set(
        photos.filter((p) => p.include !== false).map((p) => p.public_url),
      ),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (photos.length === 0) return null;

  function toggle(url: string) {
    setIncluded((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
    setSaved(false);
  }

  async function apply() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/review/${encodeURIComponent(itemId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_photo_includes",
          photo_includes: photos.map((p) => ({
            public_url: p.public_url,
            include: included.has(p.public_url),
          })),
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Failed to save photo choices");
      setSaved(true);
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save photo choices");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-teal-100 bg-teal-50/40 p-3">
      <p className="text-sm font-medium text-zinc-900">
        Submitted photos — include to keep on approve, uncheck to exclude
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((photo) => {
          const on = included.has(photo.public_url);
          return (
            <li key={photo.public_url} className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.public_url}
                alt=""
                className="aspect-[4/3] w-full rounded-md border border-zinc-200 object-cover"
              />
              <label className="flex items-center gap-2 text-xs text-zinc-700">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(photo.public_url)}
                  className="h-4 w-4 rounded border-zinc-300"
                />
                Include
              </label>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void apply()}
          className="rounded-lg bg-teal-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-900 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save photo choices"}
        </button>
        {saved ? <span className="text-xs text-teal-800">Saved</span> : null}
        {error ? <span className="text-xs text-red-600">{error}</span> : null}
      </div>
    </div>
  );
}
