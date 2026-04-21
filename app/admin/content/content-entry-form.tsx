import { upsertContentEntryAction } from "./actions";
import { OgImageUploadField } from "./og-image-upload-field";

type Entry = {
  id?: string;
  content_type?: string;
  slug?: string;
  title?: string;
  excerpt?: string | null;
  body_markdown?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  og_image_url?: string | null;
  status?: "draft" | "published" | "archived";
};

type Props = {
  entry?: Entry;
};

export function ContentEntryForm({ entry }: Props) {
  return (
    <form action={upsertContentEntryAction} className="space-y-4">
      {entry?.id ? <input type="hidden" name="id" value={entry.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium uppercase text-zinc-500">Content type</label>
          <select
            name="content_type"
            defaultValue={entry?.content_type ?? "guide"}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            {["guide", "town", "page", "event", "seasonal", "business", "service", "area"].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium uppercase text-zinc-500">Status</label>
          <select
            name="status"
            defaultValue={entry?.status ?? "draft"}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium uppercase text-zinc-500">Slug</label>
          <input
            name="slug"
            required
            defaultValue={entry?.slug ?? ""}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase text-zinc-500">Title</label>
          <input
            name="title"
            required
            defaultValue={entry?.title ?? ""}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium uppercase text-zinc-500">Excerpt</label>
        <textarea
          name="excerpt"
          defaultValue={entry?.excerpt ?? ""}
          rows={2}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-medium uppercase text-zinc-500">Body (Markdown)</label>
        <textarea
          name="body_markdown"
          defaultValue={entry?.body_markdown ?? ""}
          rows={16}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium uppercase text-zinc-500">SEO title</label>
          <input
            name="seo_title"
            defaultValue={entry?.seo_title ?? ""}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <OgImageUploadField defaultValue={entry?.og_image_url ?? ""} />
      </div>

      <div>
        <label className="block text-xs font-medium uppercase text-zinc-500">SEO description</label>
        <textarea
          name="seo_description"
          defaultValue={entry?.seo_description ?? ""}
          rows={3}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>

      <button
        type="submit"
        className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
      >
        Save Entry
      </button>
    </form>
  );
}

