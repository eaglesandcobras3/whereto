"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { nanoid } from "nanoid";
import { SearchBar } from "@/components/discovery/SearchBar";
import { CategoryGrid } from "@/components/discovery/CategoryGrid";
import { TownCard } from "@/components/discovery/TownCard";
import { SectionBlock } from "@/components/discovery/SectionBlock";
import { FeaturedCarousel } from "@/components/discovery/FeaturedCarousel";
import { PromptChips } from "@/components/home/PromptChips";
import { SiteFooter } from "@/components/home/SiteFooter";
import type { HomeFeaturedBusiness } from "@/lib/data/home-features";
import { HOME_TOWN_SPOTLIGHT_SLUGS } from "@/lib/data/home-features";
import type { TownRef, CategoryRef } from "@/lib/data/home-explorer";
import { getTownDescriptor } from "@/lib/data/town-descriptors";

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
    slug?: string;
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
  let s = localStorage.getItem("whereto30a_session");
  if (!s) {
    s = nanoid();
    localStorage.setItem("whereto30a_session", s);
  }
  return s;
}

const HOME_CATEGORY_CHIPS: { name: string; slug: string; q: string }[] = [
  { name: "Restaurants", slug: "restaurants", q: "best restaurants on 30A" },
  { name: "Coffee", slug: "coffee", q: "best coffee on 30A" },
  { name: "Things to Do", slug: "things", q: "things to do on 30A" },
  { name: "Services", slug: "services", q: "spas and services on 30A" },
];

type ExplorerProps = {
  towns: TownRef[];
  categories: CategoryRef[];
};

type FeaturedProps = {
  popular: HomeFeaturedBusiness[];
  restaurants: HomeFeaturedBusiness[];
  coffee: HomeFeaturedBusiness[];
  activities: HomeFeaturedBusiness[];
};

type Props = {
  explorer: ExplorerProps;
  featured: FeaturedProps;
};

export function HomePage({ explorer, featured }: Props) {
  const searchParams = useSearchParams();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SearchJson | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const spotlightTowns = HOME_TOWN_SPOTLIGHT_SLUGS.map((slug) =>
    explorer.towns.find((t) => t.slug === slug),
  ).filter(Boolean) as TownRef[];

  const otherTowns = explorer.towns.filter(
    (t) =>
      !(HOME_TOWN_SPOTLIGHT_SLUGS as readonly string[]).includes(t.slug),
  );

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

  const runSearch = useCallback(
    async (query: string) => {
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
    },
    [logImpressions],
  );

  useEffect(() => {
    const initial = searchParams.get("q");
    if (initial?.trim()) {
      setQ(initial);
      void runSearch(initial);
    }
  }, [searchParams, runSearch]);

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

  function logClick(
    businessId: string,
    kind: "directions" | "website",
    queryHash: string | undefined,
  ) {
    void fetch("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        business_id: businessId,
        interaction_type: "click",
        query_hash: queryHash ?? null,
        session_id: sessionKey(),
        metadata: { kind },
      }),
    });
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

  const categoryQuickLinks = HOME_CATEGORY_CHIPS.map((c) => ({
    slug: c.slug,
    name: c.name,
    href: `/?q=${encodeURIComponent(c.q)}`,
  }));

  const townQuickLinks = spotlightTowns.map((t) => ({
    slug: t.slug,
    name: t.name,
    href: `/${t.slug}`,
  }));

  const suggestedPrompts = [
    "Kid-friendly lunch near Seaside",
    "Romantic dinner on 30A",
    "Coffee with outdoor seating",
    "Quick bite after the beach",
  ];

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <div className="coastal-hero border-b border-zinc-200/60">
        <div className="mx-auto max-w-3xl px-4 pb-12 pt-14 sm:pt-20">
          <header className="space-y-4 text-center sm:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              WhereTo30A
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
              Discover the best of 30A
            </h1>
            <p className="mx-auto max-w-xl text-lg leading-relaxed text-zinc-600 sm:mx-0">
              Your AI-powered local insider — curated places, natural-language search,
              and guides for every beach town.
            </p>
            <nav className="flex flex-wrap justify-center gap-4 text-sm sm:justify-start">
              <Link
                href="/login"
                className="font-medium text-[var(--accent)] hover:underline"
              >
                Sign in
              </Link>
              <Link
                href="/saved"
                className="font-medium text-[var(--accent)] hover:underline"
              >
                Saved
              </Link>
              <Link
                href="/admin"
                className="text-zinc-500 hover:text-[var(--accent)] hover:underline"
              >
                Admin
              </Link>
              <Link
                href="/30a"
                className="text-zinc-500 hover:text-[var(--accent)] hover:underline"
              >
                Region overview
              </Link>
            </nav>
          </header>

          <div
            className={
              data
                ? "sticky top-0 z-30 mt-8 rounded-2xl border border-zinc-200/80 bg-[var(--surface)]/90 p-4 shadow-sm backdrop-blur-md"
                : "mt-10"
            }
          >
            <SearchBar
              value={q}
              onChange={onChangeInput}
              onSubmit={onSubmit}
              loading={loading}
              placeholder="Ask anything about 30A…"
              variant={data ? "default" : "hero"}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-12 px-4 py-12">
        <SectionBlock
          title="Explore by category"
          subtitle="Jump in with a curated starting point"
        >
          <CategoryGrid categories={categoryQuickLinks} />
        </SectionBlock>

        {townQuickLinks.length ? (
          <SectionBlock
            title="Explore by town"
            subtitle="Insider guides for each beach community"
          >
            <CategoryGrid categories={townQuickLinks} />
          </SectionBlock>
        ) : null}

        {!data ? (
          <div className="space-y-12">
            <FeaturedCarousel
              title="Popular right now"
              subtitle="Places people save and return to"
              businesses={featured.popular}
            />
            <FeaturedCarousel
              title="Top restaurants"
              subtitle="Dining worth planning around"
              businesses={featured.restaurants}
            />
            <FeaturedCarousel
              title="Coffee spots"
              subtitle="Espresso, cold brew, and beach walks"
              businesses={featured.coffee}
            />
            <FeaturedCarousel
              title="Things to do"
              subtitle="Activities and experiences along the coast"
              businesses={featured.activities}
            />
          </div>
        ) : null}

        <section className="rounded-2xl border border-zinc-200/80 bg-[var(--surface-elevated)] p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold text-zinc-900">
            Not sure where to start?
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Tap a prompt — we&apos;ll run a full AI search for you.
          </p>
          <div className="mt-4">
            <PromptChips
              prompts={suggestedPrompts}
              onPick={(text) => {
                setQ(text);
                void runSearch(text);
              }}
            />
          </div>
        </section>

        {explorer.towns.length ? (
          <SectionBlock
            title="Towns along 30A"
            subtitle="Deep guides with picks for each neighborhood"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {[...spotlightTowns, ...otherTowns].map((t) => (
                <TownCard
                  key={t.slug}
                  name={t.name}
                  slug={t.slug}
                  subtitle={getTownDescriptor(t.slug)}
                />
              ))}
            </div>
          </SectionBlock>
        ) : null}

        {explorer.categories.length ? (
          <SectionBlock
            title="All categories"
            subtitle="Pre-filled searches across every listing type"
          >
            <CategoryGrid
              categories={explorer.categories.map((c) => ({
                slug: c.slug,
                name: c.name,
                href: `/?q=${encodeURIComponent(`${c.name} near 30A`)}`,
              }))}
            />
          </SectionBlock>
        ) : null}

        {err ? <p className="text-sm text-red-600">{err}</p> : null}

        {data ? (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-zinc-800">{data.summary}</p>
              {data.cache_id ? (
                <button
                  type="button"
                  onClick={() => void shareResult()}
                  className="text-sm font-medium text-[var(--accent)] hover:underline"
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
                    className="rounded-2xl border border-zinc-200/80 bg-[var(--surface-elevated)] p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-lg font-semibold text-zinc-900">
                          {b.name ?? "Business"}
                        </p>
                        <p className="text-sm font-medium text-[var(--accent)]">
                          {r.headline}
                        </p>
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
                                onClick={() =>
                                  logClick(r.business_id, "directions", data?.query_hash)
                                }
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
                                onClick={() =>
                                  logClick(r.business_id, "website", data?.query_hash)
                                }
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
                    {b.slug ? (
                      <p className="mt-2">
                        <Link
                          href={`/business/${b.slug}`}
                          className="text-sm text-[var(--accent)] hover:underline"
                        >
                          Business details
                        </Link>
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>

      <SiteFooter />
    </div>
  );
}
