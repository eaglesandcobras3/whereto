"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { nanoid } from "nanoid";

type Rec = {
  business_id: string;
  rank: number;
  headline: string;
  explanation: string;
  highlighted_tags: string[];
  business: {
    id?: string;
    name?: string;
    address?: string | null;
    lat?: number;
    lng?: number;
    phone?: string | null;
    website?: string | null;
    google_rating?: number | null;
    tags?: string[];
    ai_summary?: string | null;
  };
};

type SearchJson = {
  query: string;
  query_hash: string;
  summary: string;
  recommendations: Rec[];
  suggestions?: string[];
  cached: boolean;
  cache_id?: string;
  error?: string;
};

function sessionKey() {
  if (typeof window === "undefined") return "";
  let s = localStorage.getItem("30a_session");
  if (!s) {
    s = nanoid();
    localStorage.setItem("30a_session", s);
  }
  return s;
}

export function SearchHome() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SearchJson | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logImpressions = useCallback(async (payload: SearchJson) => {
    const session_id = sessionKey();
    await fetch("/api/impressions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id,
        items: payload.recommendations.map((r, i) => ({
          business_id: r.business_id,
          query_hash: payload.query_hash,
          rank_position: i + 1,
        })),
      }),
    });
  }, []);

  async function runSearch(query: string) {
    if (!query.trim()) return;
    setLoading(true);
    setErr(null);
    setShareMsg(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const j = (await res.json()) as SearchJson & { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Search failed");
      setData(j);
      void logImpressions(j);
    } catch (e) {
      setData(null);
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void runSearch(q);
  }

  function onChangeInput(v: string) {
    setQ(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (v.trim().length >= 4) void runSearch(v);
    }, 400);
  }

  async function shareResult() {
    if (!data?.cache_id) return;
    const res = await fetch("/api/shares", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cache_id: data.cache_id }),
    });
    const j = (await res.json()) as { url?: string; error?: string };
    if (!res.ok) {
      setShareMsg(j.error ?? "Could not create share");
      return;
    }
    const full = `${window.location.origin}${j.url}`;
    await navigator.clipboard.writeText(full);
    setShareMsg(`Link copied: ${full}`);
    void fetch("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        business_id: data.recommendations[0]?.business_id,
        interaction_type: "share",
        query_hash: data.query_hash,
        session_id: sessionKey(),
      }),
    });
  }

  async function saveBusiness(id: string) {
    const res = await fetch("/api/saves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ business_id: id }),
    });
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (!res.ok) {
      const j = await res.json();
      alert(j.error ?? "Save failed");
    }
  }

  async function sendFeedback(
    businessId: string,
    type: string,
    reason?: string,
  ) {
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        business_id: businessId,
        feedback_type: type,
        feedback_reason: reason ?? null,
        query_context: data?.query ?? null,
        session_id: sessionKey(),
      }),
    });
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-12">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-teal-800">
          30A Insider
        </p>
        <h1 className="text-3xl font-semibold text-zinc-900">
          Ask anything about the Emerald Coast
        </h1>
        <p className="text-zinc-600">
          Natural-language search over curated local listings — AI picks from real data only.
        </p>
        <nav className="flex gap-4 text-sm">
          <Link href="/login" className="text-teal-700 hover:underline">
            Sign in
          </Link>
          <Link href="/saved" className="text-teal-700 hover:underline">
            Saved
          </Link>
        </nav>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={q}
          onChange={(e) => onChangeInput(e.target.value)}
          placeholder='Try "kid friendly lunch near Seaside"'
          className="flex-1 rounded-xl border border-zinc-300 px-4 py-3 text-zinc-900 shadow-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-teal-700 px-6 py-3 font-medium text-white hover:bg-teal-800 disabled:opacity-50"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {err ? <p className="text-sm text-red-600">{err}</p> : null}

      {data ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-zinc-800">{data.summary}</p>
            {data.cache_id ? (
              <button
                type="button"
                onClick={() => void shareResult()}
                className="text-sm font-medium text-teal-700 hover:underline"
              >
                Copy share link
              </button>
            ) : null}
          </div>
          {shareMsg ? <p className="text-xs text-zinc-500">{shareMsg}</p> : null}
          {data.cached ? (
            <p className="text-xs text-zinc-400">Served from cache</p>
          ) : null}

          <ul className="space-y-5">
            {data.recommendations.map((r) => {
              const b = r.business;
              const m = b.lat != null && b.lng != null;
              return (
                <li
                  key={r.business_id}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-semibold text-zinc-900">
                        {b.name ?? "Business"}
                      </p>
                      <p className="text-sm font-medium text-teal-800">{r.headline}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void saveBusiness(r.business_id)}
                        className="rounded-lg border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-50"
                      >
                        Save
                      </button>
                      <details className="relative">
                        <summary className="cursor-pointer list-none rounded-lg border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-50">
                          ⋯
                        </summary>
                        <div className="absolute right-0 z-10 mt-1 w-52 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                          {m ? (
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`}
                              target="_blank"
                              rel="noreferrer"
                              className="block px-3 py-2 text-sm hover:bg-zinc-50"
                            >
                              Directions
                            </a>
                          ) : null}
                          {b.website ? (
                            <a
                              href={b.website}
                              target="_blank"
                              rel="noreferrer"
                              className="block px-3 py-2 text-sm hover:bg-zinc-50"
                            >
                              Website
                            </a>
                          ) : null}
                          <button
                            type="button"
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-zinc-50"
                            onClick={() => void sendFeedback(r.business_id, "not_relevant")}
                          >
                            Not a good fit
                          </button>
                          <button
                            type="button"
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-zinc-50"
                            onClick={() =>
                              void sendFeedback(
                                r.business_id,
                                "had_bad_experience",
                                "poor_service",
                              )
                            }
                          >
                            Bad experience
                          </button>
                          <button
                            type="button"
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-zinc-50"
                            onClick={() => void sendFeedback(r.business_id, "hide_for_me")}
                          >
                            Don&apos;t show again
                          </button>
                        </div>
                      </details>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-zinc-700">{r.explanation}</p>
                  {b.google_rating != null ? (
                    <p className="mt-2 text-sm text-amber-700">★ {b.google_rating}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(r.highlighted_tags ?? b.tags ?? []).slice(0, 8).map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700"
                      >
                        {t.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
