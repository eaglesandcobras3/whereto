"use client";

import { useEffect, useState } from "react";

type Entity = "town" | "area";

type Props = {
  entity: Entity;
  entityId: string;
  currentImageUrl: string | null;
  onUpdated?: (url: string | null) => void;
};

const ENTITY_LABEL: Record<Entity, string> = {
  town: "town",
  area: "area",
};

/** Admin file picker for town/area hero image (writes main_image_url + hero_image_url). */
export function AdminPlaceMainImageControl({
  entity,
  entityId,
  currentImageUrl,
  onUpdated,
}: Props) {
  const [url, setUrl] = useState(currentImageUrl);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setUrl(currentImageUrl);
  }, [currentImageUrl]);

  async function upload(file: File) {
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch(
        `/api/admin/${entity}s/${encodeURIComponent(entityId)}/image`,
        { method: "POST", body: fd },
      );
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
      const res = await fetch(
        `/api/admin/${entity}s/${encodeURIComponent(entityId)}/image`,
        { method: "POST", body: fd },
      );
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
    <div className="space-y-2 rounded-lg border border-teal-200 bg-teal-50/50 p-3">
      <p className="text-xs font-medium text-teal-950">Main {ENTITY_LABEL[entity]} image</p>
      <p className="text-xs text-teal-900/80">
        Uploads to storage as WebP (max 1600px) and sets{" "}
        <code className="text-[10px]">main_image_url</code> /{" "}
        <code className="text-[10px]">hero_image_url</code>.
      </p>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="max-h-40 rounded-md object-cover" />
      ) : (
        <p className="text-xs text-zinc-600">No image set.</p>
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
      {url ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void clearImage()}
          className="text-xs font-medium text-zinc-600 underline hover:text-zinc-900 disabled:opacity-50"
        >
          Remove image
        </button>
      ) : null}
      {busy ? <p className="text-xs text-zinc-600">Working…</p> : null}
      {err ? <p className="text-xs text-red-700">{err}</p> : null}
    </div>
  );
}
