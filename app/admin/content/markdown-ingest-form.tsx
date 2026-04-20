"use client";

import { useActionState } from "react";
import { useState } from "react";

type State = {
  ok?: boolean;
  error?: string;
  slug?: string;
  type?: string;
  warnings?: string[];
} | null;

const TEMPLATES: Record<string, string> = {
  town: `---
title: "Seaside"
type: town
slug: seaside
status: published
seo_title: "Seaside, FL Local Guide | WhereTo30A"
seo_description: "A walkable beach town with iconic town center energy."
seo_keywords:
  - seaside florida
  - 30a towns
town: seaside
tags:
  - walkable
  - family-friendly
map_location:
  lat: 30.3210
  lng: -86.1350
---

Town markdown body...
`,
  guide: `---
title: "Best Breakfast in Seaside"
type: guide
slug: best-breakfast-seaside
status: published
town: seaside
guide_type: editorial
season: year_round
featured: false
seo_title: "Best Breakfast in Seaside | WhereTo30A"
seo_description: "Where to grab breakfast in Seaside and nearby."
seo_keywords:
  - seaside breakfast
  - 30a breakfast
---

Guide markdown body...
`,
  seasonal: `---
title: "Summer on 30A"
type: seasonal
slug: summer-on-30a
status: published
town: seaside
guide_type: seasonal
season: summer
featured: true
seo_title: "Summer on 30A | WhereTo30A"
seo_description: "Seasonal planning guide for summer along 30A."
---

Seasonal markdown body...
`,
  event: `---
title: "Rosemary Farmers Market"
type: event
slug: rosemary-farmers-market
status: published
town: rosemary-beach
event_date: 2026-06-01
end_date: 2026-08-31
recurrence_frequency: weekly
recurrence_weekday: 2
venue_name: "Town Center"
price: "Free"
website: "https://example.com"
address: "Rosemary Beach Town Center"
tags:
  - market
  - family-friendly
seo_description: "Weekly seasonal market in Rosemary Beach."
---

Event markdown body...
`,
};

export function ContentMarkdownIngestForm({
  action,
}: {
  action: (formData: FormData) => Promise<{ ok?: boolean; error?: string; slug?: string; type?: string }>;
}) {
  const [markdown, setMarkdown] = useState(TEMPLATES.guide);
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
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          rows={16}
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
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase text-zinc-500">Template</span>
            <select
              defaultValue="guide"
              onChange={(e) => setMarkdown(TEMPLATES[e.target.value] ?? TEMPLATES.guide)}
              className="rounded-lg border border-zinc-300 px-2 py-2 text-sm"
            >
              <option value="guide">Guide</option>
              <option value="town">Town</option>
              <option value="event">Event</option>
              <option value="seasonal">Seasonal</option>
            </select>
          </div>
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

