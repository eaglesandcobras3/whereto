"use client";

import { useEffect, useState } from "react";
import { useBusinessPhotosFeatureEnabled } from "@/lib/feature-flags-client-utils";

type Props = {
  businessId: string;
  currentImageUrl: string | null;
  onUpdated?: (url: string | null) => void;
};

/** Admin control for the main listing image (preview, remove, re-upload). */
export function AdminBusinessMainImageControl({ businessId, currentImageUrl, onUpdated }: Props) {
  const enabled = useBusinessPhotosFeatureEnabled();
  const [url, setUrl] = useState(currentImageUrl);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setUrl(currentImageUrl);
  }, [currentImageUrl]);

  if (!enabled) return null;

  async function upload(file: File) {
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch(`/api/admin/businesses/${encodeURIComponent(businessId)}/image`, {
        method: "POST",
        body: fd,
      });
      const j = (await res.json()) as { main_image_url?: string | null; error?: string };
      if (!res.ok) throw new Error(j.error ?? "Upload failed");
      const next = j.main_image_url ?? null;
      setUrl(next);
      onUpdated?.(next);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function clearImage() {
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.set("clear", "true");
      const res = await fetch(`/api/admin/businesses/${encodeURIComponent(businessId)}/image`, {
        method: "POST",
        body: fd,
      });
      const j = (await res.json()) as { main_image_url?: string | null; error?: string };
      if (!res.ok) throw new Error(j.error ?? "Remove failed");
      setUrl(null);
      onUpdated?.(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Remove failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4">
      <div>
        <p className="text-sm font-medium text-zinc-900">Main listing image</p>
        <p className="mt-1 text-xs text-zinc-500">
          Used on discovery cards and the listing header. Upload is resized to max 1600px and saved
          as WebP.
        </p>
      </div>
      {url ? (
        <div className="flex flex-wrap items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Listing preview"
            className="h-28 w-40 rounded-lg object-cover"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void clearImage()}
            className="text-sm font-medium text-zinc-700 underline-offset-2 hover:underline disabled:opacity-50"
          >
            Remove image
          </button>
        </div>
      ) : (
        <p className="text-sm text-zinc-500">No main image set.</p>
      )}
      <input
        type="file"
        accept="image/*"
        disabled={busy}
        className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-800 disabled:opacity-50"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void upload(file);
        }}
      />
      {busy ? <p className="text-xs text-zinc-500">Working…</p> : null}
      {err ? (
        <p className="text-xs text-red-700" role="alert">
          {err}
        </p>
      ) : null}
    </div>
  );
}
