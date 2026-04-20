"use client";

import { useActionState } from "react";

type ActionState = { ok?: boolean; error?: string; slug?: string } | null;

export function MarkdownIngestForm({
  action,
}: {
  action: (formData: FormData) => Promise<{ ok?: boolean; error?: string; slug?: string }>;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (_prev, formData) => action(formData),
    null,
  );

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">Add/Update via Markdown + Frontmatter</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Paste a full markdown document with frontmatter (`type: business`) to create or update a listing.
      </p>

      <form action={formAction} className="mt-4 space-y-3">
        <textarea
          name="markdown"
          required
          rows={14}
          placeholder={`---\ntitle: "Example Business"\ntype: business\nslug: example-business\ntown: seaside\ncategories:\n  - restaurants\ntags:\n  - family\nseo_description: "Great local spot."\naddress: "123 Main St"\nphone: "+1 850-555-1234"\nwebsite: "https://example.com"\nprice_range: "$$"\nlatitude: 30.321\nlongitude: -86.135\nhas_physical_location: true\n---\n\nWrite full business markdown body here...`}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
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
            <a
              href={`/business/${state.slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-teal-700 hover:underline"
            >
              Open live page
            </a>
          ) : null}
        </div>
        {state?.error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        ) : null}
        {state?.ok ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Saved successfully.
          </p>
        ) : null}
      </form>
    </section>
  );
}

