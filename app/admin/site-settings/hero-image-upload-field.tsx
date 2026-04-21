"use client";

import { useState } from "react";

type Props = {
  defaultValue: string;
};

type UploadResult = {
  url?: string;
  error?: string;
};

export function HeroImageUploadField({ defaultValue }: Props) {
  const [value, setValue] = useState(defaultValue);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  async function onFileChange(file: File | null) {
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "site-settings/home-hero");
      formData.append("alt_text", "Homepage hero image");
      const res = await fetch("/api/admin/media/upload", {
        method: "POST",
        body: formData,
      });
      const json = (await res.json()) as UploadResult;
      if (!res.ok || !json.url) {
        setResult({ error: json.error ?? "Upload failed." });
        return;
      }
      setValue(json.url);
      setResult({ url: json.url });
    } catch {
      setResult({ error: "Upload failed." });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium uppercase text-zinc-500">Hero image URL</label>
      <input
        name="hero_image_url"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        placeholder="https://..."
      />
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">
          {uploading ? "Processing..." : "Upload + Process Image"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            disabled={uploading}
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          />
        </label>
        {result?.error ? <span className="text-xs text-red-700">{result.error}</span> : null}
        {result?.url ? <span className="text-xs text-emerald-700">Uploaded and applied.</span> : null}
      </div>
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="Hero preview" className="h-28 w-full rounded-lg object-cover md:h-36" />
      ) : null}
    </div>
  );
}
