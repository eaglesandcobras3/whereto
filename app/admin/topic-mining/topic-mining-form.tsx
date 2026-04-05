"use client";

import { useState } from "react";
import type { ProcessMiningResult } from "./actions";
import { processTopicMiningAction } from "./actions";
import { MINING_SOURCE_TYPES } from "@/lib/topic-mining/source-types";

type Region = { id: number; name: string };

export function TopicMiningForm({ regions }: { regions: Region[] }) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ProcessMiningResult | null>(null);

  return (
    <form
      className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setResult(null);
        const fd = new FormData(e.currentTarget);
        const r = await processTopicMiningAction(fd);
        setResult(r);
        setPending(false);
      }}
    >
      <p className="text-sm font-medium text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        Privacy: paste only public context you have rights to use. Raw HTML is not stored — only
        aggregated category signals are saved.
      </p>
      <div>
        <label className="block text-sm font-medium text-zinc-700">Source type</label>
        <select
          name="source_type"
          className="mt-1 w-full max-w-md rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          defaultValue="manual_local_html_input"
        >
          {MINING_SOURCE_TYPES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-zinc-700">Region (optional)</label>
          <select
            name="region_id"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            defaultValue=""
          >
            <option value="">—</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">
            Town bias — slug only (optional)
          </label>
          <input
            name="town_bias"
            type="text"
            placeholder="e.g. seaside"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            autoComplete="off"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700">HTML</label>
        <textarea
          name="html"
          required
          rows={12}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs"
          placeholder="Paste HTML here…"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900 disabled:opacity-50"
      >
        {pending ? "Processing…" : "Run topic mining"}
      </button>
      {result ? (
        <p
          className={`text-sm ${result.ok ? "text-green-800" : "text-red-700"}`}
          role="status"
        >
          {result.ok
            ? `Saved or updated ${result.upserted} candidate bucket(s). Below threshold (not stored): ${result.belowThreshold}. ${result.durationMs} ms.`
            : result.error}
        </p>
      ) : null}
    </form>
  );
}
