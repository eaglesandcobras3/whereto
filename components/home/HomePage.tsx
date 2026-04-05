"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { nanoid } from "nanoid";
import { Navbar } from "@/components/Navbar";
import { SearchBar } from "@/components/discovery/SearchBar";
import { CategoryGrid } from "@/components/discovery/CategoryGrid";
import { TownCard } from "@/components/discovery/TownCard";
import { SectionBlock } from "@/components/discovery/SectionBlock";
import { FeaturedCarousel } from "@/components/discovery/FeaturedCarousel";
import { PromptChips } from "@/components/home/PromptChips";
import { SiteFooter } from "@/components/home/SiteFooter";
import { SaveButton } from "@/components/discovery/SaveButton";
import { TagPills } from "@/components/discovery/TagPills";
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

  const suggestedPrompts = [
    "Kid-friendly lunch near Seaside",
    "Romantic dinner on 30A",
    "Coffee with outdoor seating",
    "Quick bite after the beach",
    "Best brunch in Rosemary Beach",
    "Live music tonight",
  ];

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <Navbar />

      {/* Hero Section */}
      <div className="coastal-hero border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-4xl px-4 pb-12 pt-12 sm:pt-16">
          <header className="space-y-4 text-center">
            <p className="text-eyebrow">WhereTo30A</p>
            <h1 className="text-hero text-[var(--color-text-primary)]">
              Discover the best of 30A
            </h1>
            <p className="mx-auto max-w-xl text-lg leading-relaxed text-[var(--color-text-secondary)]">
              Your AI-powered local insider — curated places, natural-language
              search, and guides for every beach town along the Emerald Coast.
            </p>
          </header>

          <div
            className={
              data
                ? "sticky top-16 z-30 mt-8 rounded-2xl border border-[var(--color-border)] glass-strong p-4 shadow-premium-md"
                : "mt-10"
            }
          >
            <SearchBar
              value={q}
              onChange={onChangeInput}
              onSubmit={onSubmit}
              loading={loading}
              placeholder="Ask anything about 30A..."
              variant={data ? "default" : "hero"}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl space-y-16 px-4 py-12">
        {/* Category Quick Links */}
        <SectionBlock
          title="Explore by category"
          subtitle="Jump in with a curated starting point"
        >
          <CategoryGrid categories={categoryQuickLinks} columns={4} />
        </SectionBlock>

        {/* Featured Carousels (hide when search results shown) */}
        {!data ? (
          <div className="space-y-16">
            <FeaturedCarousel
              title="Popular right now"
              subtitle="Places people save and return to"
              businesses={featured.popular}
              showArrows
            />
            <FeaturedCarousel
              title="Top restaurants"
              subtitle="Dining worth planning around"
              businesses={featured.restaurants}
              showArrows
            />
            <FeaturedCarousel
              title="Coffee spots"
              subtitle="Espresso, cold brew, and beach walks"
              businesses={featured.coffee}
              showArrows
            />
            <FeaturedCarousel
              title="Things to do"
              subtitle="Activities and experiences along the coast"
              businesses={featured.activities}
              showArrows
            />
          </div>
        ) : null}

        {/* AI Suggestions Section */}
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-premium-sm sm:p-8">
          <h2 className="text-section text-[var(--color-text-primary)]">
            Not sure where to start?
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
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

        {/* Towns Grid */}
        {explorer.towns.length ? (
          <SectionBlock
            title="Towns along the coast"
            subtitle="Deep guides with picks for each neighborhood"
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...spotlightTowns, ...otherTowns].slice(0, 9).map((t) => (
                <TownCard
                  key={t.slug}
                  name={t.name}
                  slug={t.slug}
                  subtitle={getTownDescriptor(t.slug)}
                />
              ))}
            </div>
            {explorer.towns.length > 9 && (
              <div className="mt-6 text-center">
                <Link
                  href="/30a"
                  className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)] hover:underline"
                >
                  View all towns
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              </div>
            )}
          </SectionBlock>
        ) : null}

        {/* Error Display */}
        {err ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {err}
          </div>
        ) : null}

        {/* Search Results */}
        {data ? (
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-section text-[var(--color-text-primary)]">
                  Results
                </h2>
                <p className="mt-1 text-[var(--color-text-secondary)]">
                  {data.summary}
                </p>
              </div>
              {data.cache_id ? (
                <button
                  type="button"
                  onClick={() => void shareResult()}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition-premium-fast"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                    />
                  </svg>
                  Share
                </button>
              ) : null}
            </div>

            {shareMsg ? (
              <p className="text-xs text-[var(--color-text-tertiary)]">
                {shareMsg}
              </p>
            ) : null}
            {data.cached ? (
              <p className="text-xs text-[var(--color-text-tertiary)]">
                Served from cache
              </p>
            ) : null}

            <ul className="grid gap-4 sm:grid-cols-2">
              {data.recommendations.map((r) => {
                const b = r.business;
                const m = b.lat != null && b.lng != null;
                return (
                  <li
                    key={r.business_id}
                    className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-premium-sm transition-premium hover-lift"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {b.slug ? (
                          <Link
                            href={`/business/${b.slug}`}
                            className="text-lg font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-primary)] transition-colors"
                          >
                            {b.name ?? "Business"}
                          </Link>
                        ) : (
                          <p className="text-lg font-semibold text-[var(--color-text-primary)]">
                            {b.name ?? "Business"}
                          </p>
                        )}
                        <p className="text-sm font-medium text-[var(--color-primary)]">
                          {r.headline}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <SaveButton
                          businessId={r.business_id}
                          onSave={saveBusiness}
                          size="sm"
                        />
                        <details className="relative">
                          <summary className="cursor-pointer list-none rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] transition-colors">
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                              />
                            </svg>
                          </summary>
                          <div className="absolute right-0 z-10 mt-1 w-52 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-premium-lg">
                            {m ? (
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`}
                                target="_blank"
                                rel="noreferrer"
                                className="block px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]"
                                onClick={() =>
                                  logClick(
                                    r.business_id,
                                    "directions",
                                    data?.query_hash,
                                  )
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
                                className="block px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]"
                                onClick={() =>
                                  logClick(
                                    r.business_id,
                                    "website",
                                    data?.query_hash,
                                  )
                                }
                              >
                                Website
                              </a>
                            ) : null}
                            <button
                              type="button"
                              className="block w-full px-4 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]"
                              onClick={() =>
                                void sendFeedback(r.business_id, "not_relevant")
                              }
                            >
                              Not a good fit
                            </button>
                            <button
                              type="button"
                              className="block w-full px-4 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]"
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
                              className="block w-full px-4 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]"
                              onClick={() =>
                                void sendFeedback(r.business_id, "hide_for_me")
                              }
                            >
                              Don&apos;t show again
                            </button>
                          </div>
                        </details>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-[var(--color-text-secondary)] line-clamp-2">
                      {r.explanation}
                    </p>
                    <TagPills
                      tags={[
                        ...(r.highlighted_tags ?? []),
                        ...(b.tags ?? []),
                      ].slice(0, 6)}
                      colored
                    />
                    {b.slug ? (
                      <p className="mt-3">
                        <Link
                          href={`/business/${b.slug}`}
                          className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                        >
                          View details
                        </Link>
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {/* All Categories */}
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
      </div>

      <SiteFooter />
    </div>
  );
}
