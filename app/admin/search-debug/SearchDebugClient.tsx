"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { SearchResultPayload, ScoreBreakdown } from "@/lib/search/types";

type Props = {
  initialQuery: string;
  result: SearchResultPayload | null;
};

function ScoreBar({ value, max = 1 }: { value: number; max?: number }) {
  const pct = Math.round((value / max) * 100);
  const color = pct >= 60 ? "bg-green-500" : pct >= 35 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="w-24 h-2 bg-gray-200 rounded overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-gray-600">{value.toFixed(3)}</span>
    </div>
  );
}

function BreakdownTable({ bd }: { bd: ScoreBreakdown }) {
  const rows = [
    { label: "composite", value: bd.composite, bold: true },
    { label: "structured_match", value: bd.structured_match },
    { label: "vec_similarity", value: bd.vec_similarity },
    { label: "quality", value: bd.quality },
    { label: "data_quality", value: bd.data_quality },
    { label: "geo_score", value: bd.geo_score },
    { label: "learning_boost", value: bd.learning_boost },
  ];
  return (
    <div className="mt-1 space-y-0.5">
      {rows.map((r) => (
        <div key={r.label} className={`flex items-center gap-2 ${r.bold ? "font-semibold" : ""}`}>
          <span className="w-32 text-xs text-gray-500">{r.label}</span>
          <ScoreBar value={r.value} />
        </div>
      ))}
    </div>
  );
}

export default function SearchDebugClient({ initialQuery, result }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    startTransition(() => {
      router.push(`/admin/search-debug?q=${encodeURIComponent(query.trim())}`);
    });
  }

  const intent = result?._debug?.intent as Record<string, unknown> | undefined;
  const retrieval = result?._retrieval;
  const confidence = result?.confidence;
  const filters = result?.resolved_filters;

  return (
    <div className="font-sans">
      <h2 className="sr-only">Search query</h2>
      <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter a search query…"
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "Searching…" : "Debug Search"}
        </button>
      </form>

      {!result && initialQuery && (
        <p className="text-gray-500 text-sm">No results.</p>
      )}

      {result && (
        <div className="space-y-6">

          {/* Confidence banner */}
          {confidence && (
            <div className={`rounded border px-4 py-3 text-sm ${
              confidence.score >= 0.7 ? "border-green-300 bg-green-50" :
              confidence.score >= 0.45 ? "border-yellow-300 bg-yellow-50" :
              "border-red-300 bg-red-50"
            }`}>
              <span className="font-semibold">Confidence: {confidence.score.toFixed(2)}</span>
              {confidence.low_confidence_reasons.length > 0 && (
                <span className="ml-2 text-gray-600">: {confidence.low_confidence_reasons.join(", ")}</span>
              )}
            </div>
          )}

          {/* 2-col: intent + retrieval */}
          <div className="grid grid-cols-2 gap-4">
            {/* Parsed intent */}
            <section className="border rounded p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Parsed Intent</h2>
              {intent ? (
                <dl className="text-xs space-y-1">
                  {Object.entries(intent).map(([k, v]) => (
                    v != null && v !== "" && !(Array.isArray(v) && v.length === 0) ? (
                      <div key={k} className="flex gap-2">
                        <dt className="w-32 text-gray-500 shrink-0">{k}</dt>
                        <dd className="font-mono text-gray-900 break-all">
                          {typeof v === "object" ? JSON.stringify(v) : String(v)}
                        </dd>
                      </div>
                    ) : null
                  ))}
                </dl>
              ) : (
                <p className="text-xs text-gray-400">No intent data (dev mode or debug=false).</p>
              )}
            </section>

            {/* Retrieval path */}
            <section className="border rounded p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Retrieval</h2>
              {retrieval ? (
                <dl className="text-xs space-y-1">
                  <div className="flex gap-2">
                    <dt className="w-40 text-gray-500">path</dt>
                    <dd className="font-mono font-semibold text-blue-700">{retrieval.path}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-40 text-gray-500">attempted_paths</dt>
                    <dd className="font-mono">{retrieval.attempted_paths.join(" → ")}</dd>
                  </div>
                  {retrieval.rpc_row_count != null && (
                    <div className="flex gap-2">
                      <dt className="w-40 text-gray-500">rpc_row_count</dt>
                      <dd className="font-mono">{retrieval.rpc_row_count}</dd>
                    </div>
                  )}
                  {retrieval.after_vec_floor != null && (
                    <div className="flex gap-2">
                      <dt className="w-40 text-gray-500">after_vec_floor</dt>
                      <dd className="font-mono">{retrieval.after_vec_floor}</dd>
                    </div>
                  )}
                  {retrieval.after_post_rank_strict != null && (
                    <div className="flex gap-2">
                      <dt className="w-40 text-gray-500">after_strict</dt>
                      <dd className="font-mono">{retrieval.after_post_rank_strict}</dd>
                    </div>
                  )}
                  {retrieval.after_post_rank_relaxed != null && (
                    <div className="flex gap-2">
                      <dt className="w-40 text-gray-500">after_relaxed</dt>
                      <dd className="font-mono">{retrieval.after_post_rank_relaxed}</dd>
                    </div>
                  )}
                  {retrieval.after_sidebar_filters != null && (
                    <div className="flex gap-2">
                      <dt className="w-40 text-gray-500">after_sidebar</dt>
                      <dd className="font-mono">{retrieval.after_sidebar_filters}</dd>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <dt className="w-40 text-gray-500">total_results</dt>
                    <dd className="font-mono">{result.total_results}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-xs text-gray-400">No retrieval metrics.</p>
              )}

              {/* Active filters */}
              {filters && (
                <div className="mt-3 pt-3 border-t">
                  <h3 className="text-xs font-semibold text-gray-600 mb-1">Active Filters</h3>
                  <dl className="text-xs space-y-1">
                    {filters.town_ids.length > 0 && (
                      <div className="flex gap-2">
                        <dt className="w-40 text-gray-500">town_ids</dt>
                        <dd className="font-mono">{filters.town_ids.join(", ")}</dd>
                      </div>
                    )}
                    {filters.category_slugs.length > 0 && (
                      <div className="flex gap-2">
                        <dt className="w-40 text-gray-500">category</dt>
                        <dd className="font-mono">{filters.category_slugs.join(", ")}</dd>
                      </div>
                    )}
                    {(filters.specialty_slugs?.length ?? filters.service_category_slugs?.length) ? (
                      <div className="flex gap-2">
                        <dt className="w-40 text-gray-500">specialty</dt>
                        <dd className="font-mono">
                          {(filters.specialty_slugs ?? filters.service_category_slugs ?? []).join(", ")}
                        </dd>
                      </div>
                    ) : null}
                    {filters.vibe_tags.length > 0 && (
                      <div className="flex gap-2">
                        <dt className="w-40 text-gray-500">vibe_tags</dt>
                        <dd className="font-mono">{filters.vibe_tags.join(", ")}</dd>
                      </div>
                    )}
                    {filters.price_bucket && (
                      <div className="flex gap-2">
                        <dt className="w-40 text-gray-500">price</dt>
                        <dd className="font-mono">{filters.price_bucket}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}
            </section>
          </div>

          {/* Results */}
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              Results ({result.recommendations.length} shown of {result.total_results ?? "?"})
            </h2>
            <div className="space-y-3">
              {result.recommendations.map((rec, i) => (
                <div key={rec.business_id} className="border rounded p-4 bg-white">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-xs text-gray-400 mr-2">#{i + 1}</span>
                      <span className="font-semibold text-sm">{rec.headline}</span>
                      <span className="ml-2 text-xs text-gray-400">{rec.business.town_name}</span>
                    </div>
                    {rec.score_breakdown && (
                      <span className={`text-xs font-mono font-bold shrink-0 ${
                        rec.score_breakdown.composite >= 0.6 ? "text-green-700" :
                        rec.score_breakdown.composite >= 0.36 ? "text-yellow-700" :
                        "text-red-700"
                      }`}>
                        {rec.score_breakdown.composite.toFixed(3)}
                      </span>
                    )}
                  </div>
                  {rec.business.ai_summary && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{rec.business.ai_summary}</p>
                  )}
                  {rec.score_breakdown && (
                    <details className="mt-2">
                      <summary className="text-xs text-blue-600 cursor-pointer hover:underline">
                        Score breakdown
                      </summary>
                      <BreakdownTable bd={rec.score_breakdown} />
                    </details>
                  )}
                  <div className="mt-1 flex gap-3 text-xs text-gray-400">
                    <span>id: {rec.business_id.slice(0, 8)}…</span>
                    {rec.business.lat && rec.business.lng && (
                      <span>📍 {rec.business.lat.toFixed(4)}, {rec.business.lng.toFixed(4)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Raw JSON toggle */}
          <details className="border rounded">
            <summary className="px-4 py-2 text-xs text-gray-500 cursor-pointer hover:bg-gray-50">
              Raw response JSON
            </summary>
            <pre className="px-4 py-3 text-xs overflow-auto max-h-96 bg-gray-50">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {!initialQuery && (
        <p className="text-sm text-gray-500">
          Enter a query above to debug search results, scoring breakdowns, and retrieval paths.
        </p>
      )}
    </div>
  );
}
