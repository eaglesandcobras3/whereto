"use client";

import { useState } from "react";

type Props = {
  defaultThumbUrl?: string | null;
  defaultWideUrl?: string | null;
};

type UploadResponse = {
  url?: string;
  error?: string;
};

export function TownImageUploadFields({ defaultThumbUrl, defaultWideUrl }: Props) {
  const [thumbUrl, setThumbUrl] = useState(defaultThumbUrl ?? "");
  const [wideUrl, setWideUrl] = useState(defaultWideUrl ?? "");
  const [uploadingKey, setUploadingKey] = useState<"thumb" | "wide" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File | null, kind: "thumb" | "wide") {
    if (!file) return;
    setUploadingKey(kind);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", `towns/${kind}`);
      fd.append("alt_text", `Town ${kind} image`);
      const res = await fetch("/api/admin/media/upload", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as UploadResponse;
      if (!res.ok || !json.url) {
        setError(json.error ?? "Upload failed.");
        return;
      }
      if (kind === "thumb") setThumbUrl(json.url);
      else setWideUrl(json.url);
    } catch {
      setError("Upload failed.");
    } finally {
      setUploadingKey(null);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-zinc-200 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Town images</p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-xs font-medium uppercase text-zinc-500">Thumbnail image URL</label>
          <input
            name="hero_image_thumb_url"
            value={thumbUrl}
            onChange={(e) => setThumbUrl(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="https://..."
          />
          <label className="inline-flex cursor-pointer items-center rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">
            {uploadingKey === "thumb" ? "Processing..." : "Upload + Process Thumb"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="hidden"
              disabled={uploadingKey != null}
              onChange={(e) => upload(e.target.files?.[0] ?? null, "thumb")}
            />
          </label>
          {thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbUrl} alt="Town thumb preview" className="h-28 w-full rounded-lg object-cover" />
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium uppercase text-zinc-500">Wide hero image URL</label>
          <input
            name="hero_image_wide_url"
            value={wideUrl}
            onChange={(e) => setWideUrl(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="https://..."
          />
          <label className="inline-flex cursor-pointer items-center rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">
            {uploadingKey === "wide" ? "Processing..." : "Upload + Process Wide"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="hidden"
              disabled={uploadingKey != null}
              onChange={(e) => upload(e.target.files?.[0] ?? null, "wide")}
            />
          </label>
          {wideUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={wideUrl} alt="Town wide preview" className="h-28 w-full rounded-lg object-cover" />
          ) : null}
        </div>
      </div>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}

