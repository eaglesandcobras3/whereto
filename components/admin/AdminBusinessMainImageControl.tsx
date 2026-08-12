"use client";

import { useState } from "react";
import { useBusinessPhotosFeatureEnabled } from "@/lib/feature-flags-client-utils";

type Props = {
  businessId: string;
  currentImageUrl: string | null;
  onUpdated?: (url: string | null) => void;
};

/** Admin control to set the main listing image (writes `businesses` table URL columns). */
export function AdminBusinessMainImageControl({ businessId, currentImageUrl, onUpdated }: Props) {
  const enabled = useBusinessPhotosFeatureEnabled();
  const [url, setUrl] = useState(currentImageUrl);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-teal-200 bg-teal-50/50 p-3">
      <p className="text-xs font-medium text-teal-950">Admin — main listing image</p>
      <p className="text-xs text-teal-900/80">
        Updates <code className="text-[10px]">businesses.main_image_url</code> /{" "}
        <code className="text-[10px]">hero_image_url</code> (not the view). Compressed to WebP, max
        1600px.
      </p>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="max-h-32 rounded-md object-cover" />
      ) : (
        <p className="text-xs text-zinc-600">No main image set.</p>
      )}
      <input
        type="file"
        accept="image/*"
        disabled={busy}
        className="block w-full text-xs"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void upload(file);
        }}
      />
      {busy ? <p className="text-xs text-zinc-600">Uploading…</p> : null}
      {err ? <p className="text-xs text-red-700">{err}</p> : null}
    </div>
  );
}
