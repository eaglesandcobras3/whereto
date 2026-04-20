"use client";

import { useState } from "react";

export function MediaUploadForm() {
  const [isUploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ url?: string; error?: string } | null>(null);

  async function onSubmit(formData: FormData) {
    setUploading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/media/upload", {
        method: "POST",
        body: formData,
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        setResult({ error: json.error ?? "Upload failed" });
      } else {
        setResult({ url: json.url });
      }
    } catch {
      setResult({ error: "Upload failed." });
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      action={onSubmit}
      className="space-y-4"
    >
      <div>
        <label className="block text-xs font-medium uppercase text-zinc-500">Image file</label>
        <input
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          required
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium uppercase text-zinc-500">Folder</label>
          <input
            name="folder"
            defaultValue="site-settings"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase text-zinc-500">Alt text</label>
          <input
            name="alt_text"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={isUploading}
        className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {isUploading ? "Processing..." : "Upload + Process"}
      </button>
      {result?.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {result.error}
        </p>
      ) : null}
      {result?.url ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <p>Processed image URL:</p>
          <code className="break-all">{result.url}</code>
        </div>
      ) : null}
    </form>
  );
}

