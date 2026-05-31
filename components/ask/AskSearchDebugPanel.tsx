"use client";

import Link from "next/link";
import type { AskSearchDebug } from "@/lib/ask/search-debug";

type Props = {
  debug: AskSearchDebug;
};

export function AskSearchDebugPanel({ debug }: Props) {
  if (process.env.NODE_ENV !== "development") return null;

  const d = debug._debug;
  const adminSearchUrl = `/admin/search-debug?q=${encodeURIComponent(debug.query)}`;

  return (
    <details className="mt-4 rounded border border-amber-300 bg-amber-50 text-xs">
      <summary className="cursor-pointer px-3 py-2 font-mono font-semibold text-amber-800 select-none">
        Ask search debug (searchBusinesses)
      </summary>
      <div className="space-y-2 px-3 pb-3 pt-1">
        <div>
          <span className="font-semibold text-amber-900">resultCount:</span>{" "}
          <code className="text-amber-800">{debug.resultCount}</code>
          {debug.total_results != null ? (
            <>
              {" "}
              <span className="text-amber-700">(total {debug.total_results})</span>
            </>
          ) : null}
        </div>
        {debug.effectiveQuery ? (
          <div>
            <span className="font-semibold text-amber-900">effectiveQuery:</span>{" "}
            <code className="text-amber-800">{debug.effectiveQuery}</code>
          </div>
        ) : null}
        {debug.effectiveVibeTags?.length ? (
          <div>
            <span className="font-semibold text-amber-900">effectiveVibeTags:</span>{" "}
            <code className="text-amber-800">{debug.effectiveVibeTags.join(", ")}</code>
          </div>
        ) : null}
        {debug.discoveryThemes?.length ? (
          <div>
            <span className="font-semibold text-amber-900">themes:</span>{" "}
            <code className="text-amber-800">{debug.discoveryThemes.join(", ")}</code>
          </div>
        ) : null}
        {debug.attempts?.length ? (
          <div>
            <span className="font-semibold text-amber-900">strategies:</span>
            <pre className="mt-1 overflow-x-auto rounded bg-amber-100 p-2 text-amber-800">
              {JSON.stringify(debug.attempts, null, 2)}
            </pre>
          </div>
        ) : null}
        {debug.reviewNotes?.length ? (
          <div>
            <span className="font-semibold text-amber-900">ranked reviewNotes:</span>
            <pre className="mt-1 overflow-x-auto rounded bg-amber-100 p-2 text-amber-800">
              {JSON.stringify(debug.reviewNotes, null, 2)}
            </pre>
          </div>
        ) : null}
        <div>
          <span className="font-semibold text-amber-900">toolInput (model):</span>
          <pre className="mt-1 overflow-x-auto rounded bg-amber-100 p-2 text-amber-800">
            {JSON.stringify(debug.toolInput, null, 2)}
          </pre>
        </div>
        <div>
          <span className="font-semibold text-amber-900">rawQuery:</span>{" "}
          <code className="text-amber-800">{debug.query}</code>
        </div>
        <div>
          <span className="font-semibold text-amber-900">normalizedQuery:</span>{" "}
          <code className="text-amber-800">{debug.normalized_query}</code>
        </div>
        {debug.constrainTownId ? (
          <div>
            <span className="font-semibold text-amber-900">constrainTownId:</span>{" "}
            <code className="text-amber-800">{debug.constrainTownId}</code>
          </div>
        ) : null}
        {debug.resolved_filters ? (
          <div>
            <span className="font-semibold text-amber-900">resolved_filters:</span>
            <pre className="mt-1 overflow-x-auto rounded bg-amber-100 p-2 text-amber-800">
              {JSON.stringify(debug.resolved_filters, null, 2)}
            </pre>
          </div>
        ) : null}
        {d ? (
          <>
            <div>
              <span className="font-semibold text-amber-900">filterCategoryId:</span>{" "}
              <code className="text-amber-800">{d.filterCategoryId ?? "null"}</code>
            </div>
            <div>
              <span className="font-semibold text-amber-900">resolvedTownId:</span>{" "}
              <code className="text-amber-800">{d.resolvedTownId ?? "undefined"}</code>
            </div>
            <div>
              <span className="font-semibold text-amber-900">nearTownIds:</span>{" "}
              <code className="text-amber-800">
                {d.nearTownIds ? d.nearTownIds.join(", ") : "undefined"}
              </code>
            </div>
            <div>
              <span className="font-semibold text-amber-900">searchTermOverride:</span>{" "}
              <code className="text-amber-800">{d.searchTermOverride ?? "undefined"}</code>
            </div>
            <div>
              <span className="font-semibold text-amber-900">pageBrowseWithoutQuery:</span>{" "}
              <code className="text-amber-800">{String(d.pageBrowseWithoutQuery)}</code>
            </div>
            <div>
              <span className="font-semibold text-amber-900">skipIlike:</span>{" "}
              <code className="text-amber-800">{String(d.skipIlike)}</code>
            </div>
            <div>
              <span className="font-semibold text-amber-900">intent:</span>
              <pre className="mt-1 overflow-x-auto rounded bg-amber-100 p-2 text-amber-800">
                {JSON.stringify(d.intent, null, 2)}
              </pre>
            </div>
          </>
        ) : (
          <p className="text-amber-700">No `_debug` on payload (check NODE_ENV=development).</p>
        )}
        {debug._retrieval ? (
          <div>
            <span className="font-semibold text-amber-900">retrieval:</span>
            <pre className="mt-1 overflow-x-auto rounded bg-amber-100 p-2 text-amber-800">
              {JSON.stringify(debug._retrieval, null, 2)}
            </pre>
          </div>
        ) : null}
        {debug.confidence ? (
          <div>
            <span className="font-semibold text-amber-900">confidence:</span>
            <pre className="mt-1 overflow-x-auto rounded bg-amber-100 p-2 text-amber-800">
              {JSON.stringify(debug.confidence, null, 2)}
            </pre>
          </div>
        ) : null}
        {debug.topResults.length > 0 ? (
          <div>
            <span className="font-semibold text-amber-900">topResults:</span>
            <ul className="mt-1 list-inside list-disc text-amber-800">
              {debug.topResults.map((r) => (
                <li key={r.business_id}>
                  {r.title}
                  {(r.composite != null || r.vec_similarity != null) && (
                    <span className="font-mono text-[10px] text-amber-600">
                      {" "}
                      {r.composite != null ? `c:${r.composite.toFixed(3)}` : ""}
                      {r.composite != null && r.vec_similarity != null ? " " : ""}
                      {r.vec_similarity != null ? `v:${r.vec_similarity.toFixed(3)}` : ""}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <p>
          <Link href={adminSearchUrl} className="font-medium text-amber-900 underline">
            Open in admin search debugger
          </Link>
        </p>
      </div>
    </details>
  );
}
