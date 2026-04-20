"use client";

import { useState } from "react";
import { useActionState } from "react";

type ActionState = {
  ok?: boolean;
  error?: string;
  slug?: string;
  warnings?: string[];
  validated?: boolean;
} | null;

const BUSINESS_TEMPLATE = `---
title: "Cowgirl Kitchen"
type: business
entity_type: restaurant
slug: cowgirl-kitchen-rosemary-beach
status: published
region: 30a
town: rosemary-beach
category: dining
categories:
  - restaurants
tags:
  - restaurant
  - tacos
  - breakfast
seo_title: "Cowgirl Kitchen Rosemary Beach | Casual Tacos & Breakfast on 30A"
seo_description: "Cowgirl Kitchen in Rosemary Beach is a casual go-to for breakfast, tacos, and quick meals in the heart of town."
seo_keywords:
  - cowgirl kitchen rosemary beach
  - rosemary beach restaurants
price_range: "$$"
address: "30 N Barrett Square, Rosemary Beach, FL"
phone: "+1 850-555-1234"
website: "https://example.com"
has_physical_location: true
map_location:
  lat: 30.2806
  lng: -86.0176
---

Write full business markdown body here...
`;

export function MarkdownIngestForm({
  action,
}: {
  action: (formData: FormData) => Promise<{ ok?: boolean; error?: string; slug?: string }>;
}) {
  const [markdown, setMarkdown] = useState(BUSINESS_TEMPLATE);
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
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          rows={14}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            name="intent"
            value="process"
            disabled={pending}
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {pending ? "Processing..." : "Process Markdown"}
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
          <button
            type="button"
            onClick={() => setMarkdown(BUSINESS_TEMPLATE)}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
          >
            Load Template
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
            {state.validated ? "Validation passed." : "Saved successfully."}
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
      </form>
    </section>
  );
}

