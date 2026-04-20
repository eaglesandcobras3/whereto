"use client";

import { useActionState } from "react";

type State = { ok?: boolean; error?: string; slug?: string; type?: string } | null;

export function ContentMarkdownIngestForm({
  action,
}: {
  action: (formData: FormData) => Promise<{ ok?: boolean; error?: string; slug?: string; type?: string }>;
}) {
  const [state, formAction, pending] = useActionState<State, FormData>(
    async (_prev, formData) => action(formData),
    null,
  );

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">Ingest Markdown + Frontmatter</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Paste full markdown docs for <code>guide</code>, <code>seasonal</code>, <code>town</code>, or <code>event</code>.
      </p>
      <form action={formAction} className="mt-4 space-y-3">
        <textarea
          name="markdown"
          required
          rows={16}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
          placeholder={`---\ntitle: "Seaside"\ntype: town\nslug: seaside\nstatus: published\nseo_description: "Town summary"\ntags:\n  - walkable\n  - family\n---\n\nTown body markdown...`}
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {pending ? "Processing..." : "Process Markdown"}
          </button>
          {state?.ok && state.slug ? (
            <span className="text-sm text-emerald-700">
              Saved {state.type ?? "content"}: <code>{state.slug}</code>
            </span>
          ) : null}
        </div>
        {state?.error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        ) : null}
      </form>
    </section>
  );
}

