"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type PhotoRow = {
  id: string;
  public_url: string;
  status: string;
  is_hero: boolean;
  sort_order: number | null;
  created_at: string;
};

type Props = {
  businessId: string;
};

export function AdminBusinessPhotosManager({ businessId }: Props) {
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [asMain, setAsMain] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch(
      `/api/admin/business-photos?business_id=${encodeURIComponent(businessId)}&status=approved`,
    )
      .then(async (res) => {
        const j = (await res.json()) as { photos?: PhotoRow[]; error?: string };
        if (!res.ok) throw new Error(j.error ?? "Failed to load photos");
        setPhotos(j.photos ?? []);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [businessId]);

  useEffect(() => {
    queueMicrotask(() => load());
  }, [load]);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setErr("Choose a photo to upload.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.set("business_id", businessId);
      fd.set("file", file);
      fd.set("is_hero", asMain ? "true" : "false");
      const res = await fetch("/api/admin/business-photos", { method: "POST", body: fd });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Upload failed");
      if (fileRef.current) fileRef.current.value = "";
      setAsMain(false);
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function rejectPhoto(photoId: string) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/business-photos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_id: businessId, photo_id: photoId }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Could not remove photo");
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not remove photo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-sm font-medium text-zinc-900">Gallery photos</p>
      <p className="text-xs text-zinc-600">
        Uploads are resized (max 1600px), saved as WebP, and marked <strong>approved</strong>{" "}
        immediately (no review queue).
      </p>

      <form onSubmit={(e) => void upload(e)} className="space-y-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          disabled={busy}
          className="block w-full text-xs"
        />
        <label className="flex items-center gap-2 text-xs text-zinc-700">
          <input
            type="checkbox"
            checked={asMain}
            onChange={(e) => setAsMain(e.target.checked)}
            disabled={busy}
          />
          Also set as main listing image
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {busy ? "Working…" : "Upload gallery photo"}
        </button>
      </form>

      {err ? <p className="text-xs text-red-600">{err}</p> : null}
      {loading ? <p className="text-xs text-zinc-500">Loading gallery…</p> : null}

      {photos.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {photos.map((p) => (
            <li key={p.id} className="rounded-lg border border-zinc-100 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.public_url}
                alt=""
                className="h-28 w-full rounded object-cover"
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-500">
                  {p.is_hero ? "main" : "gallery"} · {p.status}
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void rejectPhoto(p.id)}
                  className="text-[11px] font-medium text-red-700 hover:underline disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : !loading ? (
        <p className="text-xs text-zinc-500">No approved gallery photos yet.</p>
      ) : null}
    </div>
  );
}
