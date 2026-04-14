"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { SearchBar } from "@/components/discovery/SearchBar";
import type { SearchResultPayload } from "@/lib/search/types";

const ITEMS_PER_PAGE = 12;

type Town = {
  name: string;
  slug: string;
};

type RecentPost = {
  id: string;
  name: string;
  slug: string;
  hero_image_url?: string | null;
};

export type BrowseEventRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  hero_image_url: string | null;
  event_date: string;
  end_date: string | null;
  town_name: string | null;
  town_slug: string | null;
  venue_name: string | null;
  price: string | null;
  website: string | null;
  tags: string[] | null;
};

export type BrowseTownRow = {
  id: number;
  name: string;
  slug: string;
  ai_tagline: string | null;
};

export type BrowseGuideRow = {
  slug: string;
  title: string;
  excerpt: string | null;
  seo_description: string | null;
  og_image_url: string | null;
};

export type BrowseAreaRow = {
  id: number;
  name: string;
  slug: string;
  description_short: string | null;
  area_type: string;
  town_slug: string | null;
  town_name: string | null;
};

type BrowseMode = "business" | "events" | "towns" | "guides" | "areas";

type Props = {
  browseMode?: BrowseMode;
  browseEvents?: BrowseEventRow[];
  browseTowns?: BrowseTownRow[];
  browseGuides?: BrowseGuideRow[];
  browseAreas?: BrowseAreaRow[];
  initialQuery: string;
  results: SearchResultPayload;
  townName?: string;
  footer?: React.ReactNode;
  towns?: Town[];
  recentPosts?: RecentPost[];
};

function isRemoteImage(url: string | null | undefined): boolean {
  return !!url && (url.startsWith("https://") || url.startsWith("http://"));
}

function shortEventDates(eventDate: string, endDate: string | null): string {
  const start = new Date(eventDate + "T12:00:00");
  if (!endDate || endDate === eventDate) {
    return start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  const end = new Date(endDate + "T12:00:00");
  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

export function SearchPageClient({
  browseMode = "business",
  browseEvents = [],
  browseTowns = [],
  browseGuides = [],
  browseAreas = [],
  initialQuery,
  results,
  townName,
  footer,
  towns = [],
  recentPosts = [],
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(() => searchParams.get("q") ?? "");
  const [isSearching, setIsSearching] = useState(false);

  const activePrice = searchParams.get("price");
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const urlQ = searchParams.get("q");

  const [lastUrlQ, setLastUrlQ] = useState(urlQ);
  if (urlQ !== lastUrlQ) {
    setLastUrlQ(urlQ);
    setQ(urlQ ?? "");
    setIsSearching(false);
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    const trimmed = q.trim();
    if (!trimmed) {
      params.delete("q");
    } else {
      params.set("q", trimmed);
    }
    setIsSearching(true);
    router.push(`/search?${params.toString()}`);
  };

  const togglePrice = (p: number) => {
    if (browseMode !== "business") return;
    const params = new URLSearchParams(searchParams.toString());
    if (activePrice === p.toString()) {
      params.delete("price");
    } else {
      params.set("price", p.toString());
    }
    params.delete("page");
    router.push(`/search?${params.toString()}`);
  };

  const totalResults =
    browseMode === "events"
      ? browseEvents.length
      : browseMode === "towns"
        ? browseTowns.length
        : browseMode === "guides"
          ? browseGuides.length
          : browseMode === "areas"
            ? browseAreas.length
            : results.recommendations.length;

  const totalPages = Math.ceil(totalResults / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;

  const paginatedBusiness = results.recommendations.slice(startIndex, endIndex);
  const paginatedEvents = browseEvents.slice(startIndex, endIndex);
  const paginatedTowns = browseTowns.slice(startIndex, endIndex);
  const paginatedGuides = browseGuides.slice(startIndex, endIndex);
  const paginatedAreas = browseAreas.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page === 1) {
      params.delete("page");
    } else {
      params.set("page", page.toString());
    }
    router.push(`/search?${params.toString()}`);
  };

  const headingSecondary =
    browseMode === "business"
      ? `${totalResults} results for “${initialQuery}”`
      : browseMode === "events"
        ? `${totalResults} upcoming events`
        : browseMode === "towns"
          ? `${totalResults} towns`
          : browseMode === "areas"
            ? `${totalResults} areas`
            : `${totalResults} guides`;

  const hasRows =
    browseMode === "events"
      ? paginatedEvents.length > 0
      : browseMode === "towns"
        ? paginatedTowns.length > 0
        : browseMode === "guides"
          ? paginatedGuides.length > 0
          : browseMode === "areas"
            ? paginatedAreas.length > 0
            : paginatedBusiness.length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <div className="sticky top-[var(--site-header-offset)] z-30 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 py-4 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <SearchBar
                value={q}
                onChange={setQ}
                onSubmit={handleSearch}
                loading={isSearching}
                variant="compact"
                placeholder={
                  browseMode === "events"
                    ? "Search events by name or description…"
                    : browseMode === "towns"
                      ? "Filter towns by name…"
                      : browseMode === "guides"
                        ? "Search guides…"
                        : browseMode === "areas"
                          ? "Search areas and districts…"
                          : "Search anything on 30A…"
                }
              />
            </div>
            {browseMode === "business" ? (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
                <div className="flex items-center gap-1 rounded-full bg-[var(--color-surface-secondary)] p-1">
                  {[1, 2, 3, 4].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePrice(p)}
                      className={`h-8 w-10 rounded-full text-xs font-bold transition-all ${
                        activePrice === p.toString()
                          ? "bg-[var(--color-primary)] text-white shadow-sm"
                          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]"
                      }`}
                    >
                      {"$".repeat(p)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex flex-col gap-8 lg:flex-row">
            <div className="flex-1 lg:w-2/3">
              <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-3xl">
                  {headingSecondary}
                  {townName && browseMode === "business" ? (
                    <span className="text-[var(--color-text-secondary)]"> in {townName}</span>
                  ) : null}
                </h1>
                {browseMode !== "business" ? (
                  <p className="mt-2 text-sm text-[var(--color-text-tertiary)]">
                    Browsing: <span className="font-medium text-[var(--color-text-secondary)]">{initialQuery}</span>
                    {townName ? (
                      <span className="text-[var(--color-text-tertiary)]"> · scoped to {townName}</span>
                    ) : null}
                  </p>
                ) : null}
                {results.summary ? (
                  <p className="mt-3 text-base text-[var(--color-text-secondary)] leading-relaxed">
                    {results.summary}
                  </p>
                ) : null}
              </div>

              {hasRows ? (
                <div className="space-y-6">
                  {browseMode === "business"
                    ? paginatedBusiness.map((rec) => {
                        const img = rec.business.image_url || rec.business.hero_image_url;
                        return (
                          <article
                            key={rec.business_id}
                            className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-all hover:border-[var(--color-border-strong)] hover:shadow-md sm:p-6"
                          >
                            <Link
                              href={`/business/${rec.business.slug}`}
                              className="flex flex-col gap-4 sm:flex-row sm:gap-6"
                            >
                              <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-lg bg-[var(--color-surface-secondary)] sm:aspect-[4/3] sm:w-40">
                                {img && isRemoteImage(img) ? (
                                  <Image
                                    src={img}
                                    alt={rec.business.name}
                                    fill
                                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center">
                                    <span className="material-symbols-outlined text-4xl text-[var(--color-text-tertiary)]">
                                      storefront
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-1 flex-col">
                                <h2 className="text-lg font-semibold text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-primary)]">
                                  {rec.business.name}
                                </h2>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                                  {rec.business.price_level ? (
                                    <span className="font-medium text-[var(--color-text-tertiary)]">
                                      {"$".repeat(rec.business.price_level)}
                                    </span>
                                  ) : null}
                                  {rec.business.town_name ? (
                                    <>
                                      <span className="text-[var(--color-text-tertiary)]">·</span>
                                      <span>{rec.business.town_name}</span>
                                    </>
                                  ) : null}
                                </div>
                                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                                  {rec.explanation ||
                                    rec.business.ai_summary ||
                                    "Discover this local gem on 30A."}
                                </p>
                                {rec.business.tags && rec.business.tags.length > 0 ? (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {rec.business.tags.slice(0, 3).map((tag) => (
                                      <span
                                        key={tag}
                                        className="rounded-full bg-[var(--color-surface-secondary)] px-2 py-0.5 text-xs font-medium text-[var(--color-text-secondary)]"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            </Link>
                          </article>
                        );
                      })
                    : null}

                  {browseMode === "events"
                    ? paginatedEvents.map((ev) => (
                        <article
                          key={ev.id}
                          className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-all hover:border-[var(--color-border-strong)] hover:shadow-md sm:p-6"
                        >
                          <Link
                            href={`/events/${ev.slug}`}
                            className="flex flex-col gap-4 sm:flex-row sm:gap-6"
                          >
                            <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-lg bg-[var(--color-surface-secondary)] sm:aspect-[4/3] sm:w-40">
                              {ev.hero_image_url && isRemoteImage(ev.hero_image_url) ? (
                                <Image
                                  src={ev.hero_image_url}
                                  alt=""
                                  fill
                                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <span className="material-symbols-outlined text-4xl text-[var(--color-text-tertiary)]">
                                    event
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-1 flex-col">
                              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                                {shortEventDates(ev.event_date, ev.end_date)}
                              </p>
                              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-primary)]">
                                {ev.title}
                              </h2>
                              <div className="mt-1 flex flex-wrap gap-2 text-sm text-[var(--color-text-secondary)]">
                                {ev.town_name ? <span>{ev.town_name}</span> : null}
                                {ev.venue_name ? <span>{ev.venue_name}</span> : null}
                                {ev.price ? (
                                  <span className="font-medium text-[var(--color-text-primary)]">{ev.price}</span>
                                ) : null}
                              </div>
                              {ev.description ? (
                                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                                  {ev.description}
                                </p>
                              ) : null}
                            </div>
                          </Link>
                        </article>
                      ))
                    : null}

                  {browseMode === "towns"
                    ? paginatedTowns.map((t) => (
                        <article
                          key={t.id}
                          className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-all hover:border-[var(--color-border-strong)] hover:shadow-md sm:p-6"
                        >
                          <Link href={`/${t.slug}`} className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-6">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-secondary)] text-[var(--color-primary)]">
                              <span className="material-symbols-outlined text-3xl">location_city</span>
                            </div>
                            <div className="flex-1">
                              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-primary)]">
                                {t.name}
                              </h2>
                              {t.ai_tagline ? (
                                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                                  {t.ai_tagline}
                                </p>
                              ) : (
                                <p className="mt-2 text-sm text-[var(--color-text-tertiary)]">
                                  Explore this 30A beach town.
                                </p>
                              )}
                            </div>
                          </Link>
                        </article>
                      ))
                    : null}

                  {browseMode === "areas"
                    ? paginatedAreas.map((a) => {
                        const inner = (
                          <>
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-secondary)] text-[var(--color-primary)]">
                              <span className="material-symbols-outlined text-3xl">explore</span>
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                                {a.area_type.replace(/_/g, " ")}
                              </p>
                              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-primary)]">
                                {a.name}
                              </h2>
                              <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                                {a.town_name ? <span>{a.town_name}</span> : null}
                              </div>
                              {a.description_short ? (
                                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                                  {a.description_short}
                                </p>
                              ) : (
                                <p className="mt-2 text-sm text-[var(--color-text-tertiary)]">
                                  Named place or district on 30A.
                                </p>
                              )}
                            </div>
                          </>
                        );
                        return (
                          <article
                            key={a.id}
                            className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-all hover:border-[var(--color-border-strong)] hover:shadow-md sm:p-6"
                          >
                            {a.town_slug ? (
                              <Link
                                href={`/${a.town_slug}`}
                                className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-6"
                              >
                                {inner}
                              </Link>
                            ) : (
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-6">{inner}</div>
                            )}
                          </article>
                        );
                      })
                    : null}

                  {browseMode === "guides"
                    ? paginatedGuides.map((g) => (
                        <article
                          key={g.slug}
                          className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-all hover:border-[var(--color-border-strong)] hover:shadow-md sm:p-6"
                        >
                          <Link href={`/guide/${g.slug}`} className="flex flex-col gap-4 sm:flex-row sm:gap-6">
                            <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-lg bg-[var(--color-surface-secondary)] sm:aspect-[4/3] sm:w-40">
                              {g.og_image_url && isRemoteImage(g.og_image_url) ? (
                                <Image
                                  src={g.og_image_url}
                                  alt=""
                                  fill
                                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <span className="material-symbols-outlined text-4xl text-[var(--color-text-tertiary)]">
                                    menu_book
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-1 flex-col">
                              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-primary)]">
                                {g.title}
                              </h2>
                              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                                {g.excerpt || g.seo_description || "Local guide on WhereTo30A."}
                              </p>
                            </div>
                          </Link>
                        </article>
                      ))
                    : null}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-tertiary)]">
                    <span className="material-symbols-outlined !text-3xl">search_off</span>
                  </div>
                  <h2 className="text-lg font-bold text-[var(--color-text-primary)]">No results found</h2>
                  <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                    Try adjusting your search or filters to find what you&apos;re looking for.
                  </p>
                </div>
              )}

              {totalPages > 1 ? (
                <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
                  <button
                    type="button"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-secondary)] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Previous page"
                  >
                    <span className="material-symbols-outlined text-xl">chevron_left</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      const showPage =
                        page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;

                      if (!showPage) {
                        if (page === 2 || page === totalPages - 1) {
                          return (
                            <span
                              key={page}
                              className="flex h-10 w-10 items-center justify-center text-[var(--color-text-tertiary)]"
                            >
                              ...
                            </span>
                          );
                        }
                        return null;
                      }

                      return (
                        <button
                          key={page}
                          type="button"
                          onClick={() => goToPage(page)}
                          className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                            page === currentPage
                              ? "bg-[var(--color-primary)] text-white"
                              : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]"
                          }`}
                          aria-current={page === currentPage ? "page" : undefined}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-secondary)] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Next page"
                  >
                    <span className="material-symbols-outlined text-xl">chevron_right</span>
                  </button>
                </nav>
              ) : null}

              {totalResults > 0 ? (
                <p className="mt-4 text-center text-sm text-[var(--color-text-tertiary)]">
                  Showing {startIndex + 1}–{Math.min(endIndex, totalResults)} of {totalResults} results
                </p>
              ) : null}
            </div>

            <aside className="lg:w-1/3">
              <div className="sticky top-32 space-y-8">
                {recentPosts.length > 0 ? (
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                      Recent Posts
                    </h3>
                    <ul className="mt-4 space-y-4">
                      {recentPosts.map((post) => (
                        <li key={post.id}>
                          <Link href={`/business/${post.slug}`} className="group flex items-center gap-3">
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[var(--color-surface-secondary)]">
                              {post.hero_image_url ? (
                                <Image
                                  src={post.hero_image_url}
                                  alt={post.name}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <span className="material-symbols-outlined text-lg text-[var(--color-text-tertiary)]">
                                    storefront
                                  </span>
                                </div>
                              )}
                            </div>
                            <span className="line-clamp-2 text-sm font-medium text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-primary)]">
                              {post.name}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {towns.length > 0 ? (
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                      Explore Towns
                    </h3>
                    <ul className="mt-4 space-y-2">
                      {towns.map((town) => (
                        <li key={town.slug}>
                          <Link
                            href={`/${town.slug}`}
                            className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-primary)]"
                          >
                            <span className="material-symbols-outlined text-base">location_on</span>
                            {town.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </aside>
          </div>
        </div>
      </main>

      {footer}
    </div>
  );
}
