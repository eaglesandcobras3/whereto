"use client";

import { useActionState } from "react";

type Row = { id: number; name: string; slug?: string; category?: string };

export function BusinessEditForm({
  businessId,
  business,
  towns,
  categories,
  tags,
  selectedTagIds,
  updateAction,
}: {
  businessId: string;
  business: Record<string, unknown>;
  towns: Row[];
  categories: Row[];
  tags: Row[];
  selectedTagIds: Set<string>;
  updateAction: (formData: FormData) => Promise<{ error?: string; ok?: boolean }>;
}) {
  const [state, formAction] = useActionState(
    async (_prev: { error?: string; ok?: boolean } | null, formData: FormData) => {
      return updateAction(formData);
    },
    null,
  );

  return (
    <form
      key={businessId}
      action={formAction}
      className="max-w-2xl space-y-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
    >
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

      <button
        type="submit"
        className="rounded-lg bg-teal-700 px-5 py-2 text-sm font-medium text-white hover:bg-teal-800"
      >
        Save changes
      </button>
    </form>
  );
}
