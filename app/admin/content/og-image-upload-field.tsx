"use client";

import { useState } from "react";

type Props = {
  defaultValue?: string | null;
};

type UploadResponse = {
  url?: string;
  error?: string;
};

export function OgImageUploadField({ defaultValue }: Props) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadImage(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "content/og-images");
      formData.append("alt_text", "Content OG image");
      const res = await fetch("/api/admin/media/upload", {
        method: "POST",
        body: formData,
      });
      const json = (await res.json()) as UploadResponse;
      if (!res.ok || !json.url) {
        setError(json.error ?? "Upload failed.");
        return;
      }
      setValue(json.url);
    } catch {
      setError("Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="block text-xs font-medium uppercase text-zinc-500">OG image URL</label>
      <input
        name="og_image_url"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">
          {uploading ? "Processing..." : "Upload + Process"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            disabled={uploading}
            onChange={(e) => uploadImage(e.target.files?.[0] ?? null)}
          />
        </label>
        {error ? <span className="text-xs text-red-700">{error}</span> : null}
      </div>
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="OG preview" className="mt-2 h-24 w-full rounded-lg object-cover" />
      ) : null}
    </div>
  );
}
