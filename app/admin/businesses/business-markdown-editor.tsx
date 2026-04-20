"use client";

import { useActionState } from "react";

type ActionResult = {
  ok?: boolean;
  error?: string;
  slug?: string;
  warnings?: string[];
  validated?: boolean;
} | null;

export function BusinessMarkdownEditor({
  initialMarkdown,
  action,
}: {
  initialMarkdown: string;
  action: (formData: FormData) => Promise<{ ok?: boolean; error?: string; slug?: string }>;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    async (_prev, formData) => action(formData),
    null,
  );

  return (
    <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">Markdown + Frontmatter Editor</h2>
      <p className="text-sm text-zinc-600">
        Edit this listing in full markdown/frontmatter format and process in one save.
      </p>
      <form action={formAction} className="space-y-3">
        <textarea
          name="markdown"
          defaultValue={initialMarkdown}
          rows={20}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            name="intent"
            value="process"
            disabled={pending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
          >
            {pending ? "Processing..." : "Save from Markdown"}
          </button>
          <button
            type="submit"
            name="intent"
            value="validate"
            disabled={pending}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
          >
            Validate Markdown
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
        {state?.warnings && state.warnings.length > 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <p className="font-semibold">Warnings</p>
            <ul className="mt-1 list-disc pl-5">
              {state.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {state?.ok ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {state.validated ? "Validation passed." : "Saved successfully from markdown."}
          </p>
        ) : null}
      </form>
    </section>
  );
}

