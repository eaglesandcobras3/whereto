"use client";

import { useCallback, useEffect, useState } from "react";

type ImageRow = { id: string; storage_url: string; sort: number; alt: string | null };

type Props = {
  propertyId: string;
  propertyTitle: string;
  onDone?: () => void;
};

/**
 * Admin include/exclude review for rental intake photos.
 */
export function AdminRentalPhotoReview({ propertyId, propertyTitle, onDone }: Props) {
  const [images, setImages] = useState<ImageRow[]>([]);
  const [included, setIncluded] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/rentals/photos?property_id=${encodeURIComponent(propertyId)}`);
      const json = (await res.json()) as { error?: string; images?: ImageRow[] };
      if (!res.ok) throw new Error(json.error || "Failed to load photos");
      const imgs = json.images ?? [];
      setImages(imgs);
      setIncluded(new Set(imgs.map((i) => i.id)));
      setLoaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load photos");
    }
  }, [propertyId]);

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
  }

  async function apply(publish: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/rentals/photos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: propertyId,
          include_image_ids: [...included],
          status: publish ? "published" : undefined,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Failed to apply photo review");
      onDone?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to apply photo review");
    } finally {
      setBusy(false);
    }
  }

  if (!loaded && !error) {
    return <p className="text-sm text-zinc-500">Loading photos…</p>;
  }

  if (images.length === 0) {
    return (
      <p className="text-sm text-zinc-600">
        No photos submitted for {propertyTitle}.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-teal-100 bg-teal-50/40 p-3">
      <p className="text-sm font-medium text-zinc-900">
        Photo review — include photos to keep on {propertyTitle}
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {images.map((img, index) => {
          const on = included.has(img.id);
          return (
            <li key={img.id}>
              <label className="block cursor-pointer">
                <span className="relative block overflow-hidden rounded-lg border border-zinc-200 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.storage_url}
                    alt={img.alt || `Photo ${index + 1}`}
                    className={`aspect-[4/3] w-full object-cover ${on ? "" : "opacity-40"}`}
                  />
                  <span className="absolute left-2 top-2 rounded bg-white/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-800">
                    {index === 0 ? "Main" : `Photo ${index + 1}`}
                  </span>
                </span>
                <span className="mt-1.5 flex items-center gap-2 text-xs text-zinc-800">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(img.id)}
                  />
                  Include
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || included.size === 0}
          onClick={() => void apply(false)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 disabled:opacity-50"
        >
          Save photo choices
        </button>
        <button
          type="button"
          disabled={busy || included.size === 0}
          onClick={() => void apply(true)}
          className="rounded-lg bg-teal-800 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          Save &amp; publish
        </button>
      </div>
    </div>
  );
}
