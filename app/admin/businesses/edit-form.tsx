"use client";

import { useActionState, useState } from "react";
import Image from "next/image";

type Row = { id: number; name: string; slug?: string; category?: string };

export type BusinessImage = {
  id: string;
  public_url: string;
  image_type: string;
  attribution_text?: string | null;
};

export function BusinessEditForm({
  businessId,
  business,
  towns,
  categories,
  tags,
  selectedTagIds,
  businessImages,
  updateAction,
  addImageAction,
  deleteImageAction,
  deleteAction,
}: {
  businessId: string;
  business: Record<string, unknown>;
  towns: Row[];
  categories: Row[];
  tags: Row[];
  selectedTagIds: Set<string>;
  businessImages: BusinessImage[];
  updateAction: (formData: FormData) => Promise<{ error?: string; ok?: boolean }>;
  addImageAction: (formData: FormData) => Promise<{ error?: string; ok?: boolean }>;
  deleteImageAction: (imageId: string) => Promise<{ error?: string; ok?: boolean }>;
  deleteAction: () => Promise<{ error?: string; ok?: boolean; deleted?: boolean }>;
}) {
  const [publicUrlInput, setPublicUrlInput] = useState("");
  const [imageTypeInput, setImageTypeInput] = useState("owner");
  const [attributionInput, setAttributionInput] = useState("");
  const [fileInput, setFileInput] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  const [state, formAction] = useActionState(
    async (_prev: { error?: string; ok?: boolean } | null, formData: FormData) => {
      return updateAction(formData);
    },
    null,
  );

  const [addImageState, addImageFormAction] = useActionState(
    async (_prev: { error?: string; ok?: boolean } | null, formData: FormData) => {
      return addImageAction(formData);
    },
    null,
  );

  async function uploadSelectedFileToProcessedUrl() {
    if (!fileInput) {
      setUploadMessage("Choose a file first.");
      return;
    }
    setUploadingFile(true);
    setUploadMessage(null);
    try {
      const fd = new FormData();
      fd.append("file", fileInput);
      fd.append("folder", `businesses/${businessId}`);
      fd.append("alt_text", attributionInput);

      const res = await fetch("/api/admin/media/upload", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        setUploadMessage(json.error ?? "File upload failed.");
        return;
      }
      setPublicUrlInput(json.url);
      setUploadMessage("File processed and uploaded. URL is filled in below.");
    } catch {
      setUploadMessage("File upload failed.");
    } finally {
      setUploadingFile(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <form
          key={businessId}
          action={formAction}
          className="space-y-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900">General Information</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (confirm("Are you sure you want to delete this business?")) {
                    const res = await deleteAction();
                    if (res.deleted) {
                      window.location.href = "/admin/businesses";
                    } else if (res.error) {
                      alert(res.error);
                    }
                  }
                }}
                className="rounded-lg bg-red-50 px-5 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
              >
                Delete Business
              </button>
              <button
                type="submit"
                className="rounded-lg bg-teal-700 px-5 py-2 text-sm font-medium text-white hover:bg-teal-800"
              >
                Save changes
              </button>
            </div>
          </div>

          {state?.error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
          ) : null}
          {state?.ok ? (
            <p className="rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-800">Saved.</p>
          ) : null}

          <div>
            <label className="block text-sm font-medium text-zinc-700">Name</label>
            <input
              name="name"
              defaultValue={String(business.name ?? "")}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-700">Town</label>
              <select
                name="town_id"
                defaultValue={business.town_id != null ? String(business.town_id) : ""}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
              >
                <option value="">—</option>
                {towns.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">Category</label>
              <select
                name="category_id"
                defaultValue={business.category_id != null ? String(business.category_id) : ""}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
              >
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">Hero Image URL</label>
            <input
              name="hero_image_url"
              defaultValue={String(business.hero_image_url ?? "")}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">Status</label>
            <select
              name="status"
              defaultValue={String(business.status ?? "active")}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
            >
              {["active", "hidden", "closed", "flagged"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="has_physical_location"
                defaultChecked={Boolean(business.has_physical_location ?? true)}
              />
              Has physical storefront/location
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="admin_suppressed"
                defaultChecked={Boolean(business.admin_suppressed)}
              />
              Admin suppressed
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="suspected_closed"
                defaultChecked={Boolean(business.suspected_closed)}
              />
              Suspected closed
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">AI summary</label>
            <textarea
              name="ai_summary"
              rows={5}
              defaultValue={String(business.ai_summary ?? "")}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-sans text-sm"
            />
          </div>

          <fieldset>
            <legend className="text-sm font-medium text-zinc-700">Tags</legend>
            <p className="mt-1 text-xs text-zinc-500">
              Check existing tags below, and/or add new tags in slug format (comma or newline separated).
            </p>
            <textarea
              name="extra_tags"
              rows={2}
              placeholder="e.g. date-night, live-music, dog-friendly"
              className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-zinc-200 p-3">
              <ul className="grid gap-2 sm:grid-cols-2">
                {tags.map((t) => (
                  <li key={t.id}>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="tag_ids"
                        value={t.id}
                        defaultChecked={selectedTagIds.has(String(t.id))}
                      />
                      <span>{t.name}</span>
                      <span className="text-zinc-400">({t.category})</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          </fieldset>
        </form>
      </div>

      <div className="space-y-6">
        <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Photos</h2>
          
          <div className="grid gap-4">
            {businessImages.map((img) => (
              <div key={img.id} className="group relative flex items-start gap-4 rounded-lg border border-zinc-100 p-2">
                <div className="relative h-16 w-16 overflow-hidden rounded">
                  <Image
                    src={img.public_url}
                    alt={img.attribution_text || "Business image"}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs text-zinc-500">{img.public_url}</p>
                  <p className="text-xs font-medium">{img.image_type}</p>
                  <button
                    onClick={() => deleteImageAction(img.id)}
                    className="mt-1 text-xs text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          <form action={addImageFormAction} className="space-y-3 pt-4 border-t border-zinc-100">
            <p className="text-sm font-medium text-zinc-700">Add Photo</p>
            {addImageState?.error ? (
              <p className="text-xs text-red-600">{addImageState.error}</p>
            ) : null}
            {uploadMessage ? <p className="text-xs text-zinc-600">{uploadMessage}</p> : null}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={(e) => setFileInput(e.target.files?.[0] ?? null)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={uploadSelectedFileToProcessedUrl}
              disabled={uploadingFile}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
            >
              {uploadingFile ? "Uploading file..." : "Upload file (process + fill URL)"}
            </button>
            <input
              name="public_url"
              value={publicUrlInput}
              onChange={(e) => setPublicUrlInput(e.target.value)}
              placeholder="Public URL (https://...)"
              className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
              required
            />
            <select
              name="image_type"
              value={imageTypeInput}
              onChange={(e) => setImageTypeInput(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
            >
              <option value="owner">Owner</option>
              <option value="licensed">Licensed</option>
              <option value="commons">Commons</option>
              <option value="mapillary">Mapillary</option>
            </select>
            <input
              name="attribution_text"
              value={attributionInput}
              onChange={(e) => setAttributionInput(e.target.value)}
              placeholder="Attribution (optional)"
              className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-900"
            >
              Add Photo
            </button>
          </form>
        </section>

        {!!business.hero_image_url && (
          <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <p className="p-4 text-sm font-medium border-b border-zinc-200">Current Hero Image</p>
            <div className="relative aspect-video w-full">
              <Image
                src={String(business.hero_image_url)}
                alt="Hero"
                fill
                unoptimized
                className="object-cover"
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
