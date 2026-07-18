"use client";

import { useState } from "react";
import type { PageKind, ScoreResult } from "@/lib/irse";

const KINDS: { value: PageKind; label: string }[] = [
  { value: "business", label: "Business" },
  { value: "guide", label: "Guide" },
  { value: "town", label: "Town" },
  { value: "area", label: "Area" },
  { value: "category", label: "Category" },
];

export function IrseScorerClient() {
  const [kind, setKind] = useState<PageKind>("business");
  const [slug, setSlug] = useState("");
  const [inspect, setInspect] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScoreResult | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const params = new URLSearchParams({
        kind,
        slug: slug.trim(),
      });
      if (inspect) params.set("inspect", "1");
      const res = await fetch(`/api/admin/irse/score?${params.toString()}`);
      const data = (await res.json()) as ScoreResult & { error?: string };
      if (!res.ok) {
        setError(data.error ?? `Request failed (${res.status})`);
        return;
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 space-y-8">
      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-zinc-800">Kind</span>
            <select
              className="mt-1 w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm"
              value={kind}
              onChange={(e) => setKind(e.target.value as PageKind)}
            >
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-zinc-800">Slug</span>
            <input
              className="mt-1 w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. amavida-coffee-roasters-seaside"
              required
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={inspect}
            onChange={(e) => setInspect(e.target.checked)}
          />
          Inspect GSC (uses URL Inspection quota when cache is stale)
        </label>
        <button
          type="submit"
          disabled={loading || !slug.trim()}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Scoring…" : "Score page"}
        </button>
      </form>

      {error ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error}
        </p>
      ) : null}

      {result ? <ScorePanel result={result} /> : null}
    </div>
  );
}

function ScorePanel({ result }: { result: ScoreResult }) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-zinc-200 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">{result.kind}</p>
            <h2 className="font-headline text-xl font-bold text-zinc-900">{result.slug}</h2>
            <p className="text-sm text-zinc-600">{result.path}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold tabular-nums text-zinc-900">{result.overallScore}</p>
            <p className="text-sm text-zinc-600">
              {result.indexReady ? "Index ready" : "Not index ready"} · {result.band.replace(/_/g, " ")}
            </p>
            <p className="text-xs text-zinc-500">Confidence {(result.confidence * 100).toFixed(0)}%</p>
          </div>
        </div>

        {result.gsc ? (
          <p className="mt-3 text-sm text-zinc-700">
            GSC:{" "}
            {result.gsc.indexed == null
              ? "unknown"
              : result.gsc.indexed
                ? "indexed"
                : "not indexed"}
            {result.gsc.coverageState ? ` (${result.gsc.coverageState})` : ""}
            {result.gsc.inspectedAt
              ? ` · inspected ${new Date(result.gsc.inspectedAt).toLocaleString()}`
              : ""}
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-5">
        {(
          [
            ["entity", result.scores.entity],
            ["content", result.scores.content],
            ["seo", result.scores.seo],
            ["discovery", result.scores.discovery],
            ["trust", result.scores.trust],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded border border-zinc-200 px-3 py-2 text-center">
            <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
            <p className="text-lg font-semibold tabular-nums text-zinc-900">{value}</p>
          </div>
        ))}
      </div>

      {result.flags.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Flags</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {result.flags.map((f) => (
              <li key={`${f.code}-${f.message}`} className="flex gap-2">
                <span
                  className={
                    f.severity === "critical"
                      ? "font-medium text-red-700"
                      : f.severity === "warning"
                        ? "font-medium text-amber-700"
                        : "font-medium text-zinc-500"
                  }
                >
                  {f.severity}
                </span>
                <span className="text-zinc-700">{f.message}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.recommendations.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Recommendations</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
            {result.recommendations.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
