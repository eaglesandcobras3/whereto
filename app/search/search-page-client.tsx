"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { RemoteCoverImage } from "@/components/discovery/RemoteCoverImage";
import type { SearchResultPayload } from "@/lib/search/types";

const ITEMS_PER_PAGE = 12;

export type DiscoveryTag = {
  name: string;
  slug: string;
};

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
  /** Present on `upcoming_events`: next occurrence (weekly) or `event_date` for one-off rows. */
  next_list_date?: string | null;
  recurrence_frequency?: string | null;
  recurrence_weekday?: number | null;
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

type BrowseMode = "business" | "events" | "towns" | "guides" | "areas" | "access";

function areaTypeLabel(areaType: string): string {
  if (areaType === "point_of_interest") return "Landmark / park / access";
  return areaType.replace(/_/g, " ");
}

type Props = {
  browseMode?: BrowseMode;
  browseEvents?: BrowseEventRow[];
  browseTowns?: BrowseTownRow[];
  browseGuides?: BrowseGuideRow[];
  browseAreas?: BrowseAreaRow[];
  initialQuery: string;
  results: SearchResultPayload;
  townName?: string;
  towns?: Town[];
  recentPosts?: RecentPost[];
  discoveryTags?: DiscoveryTag[];
};

function shortEventDates(eventDate: string, endDate: string | null): string {
  const start = new Date(eventDate + "T12:00:00");
  if (!endDate || endDate === eventDate) {
    return start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  const end = new Date(endDate + "T12:00:00");
  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function formatEventBrowseWhen(ev: BrowseEventRow): string {
  if (
    ev.recurrence_frequency === "weekly" &&
    ev.recurrence_weekday != null &&
    ev.recurrence_weekday >= 0 &&
    ev.recurrence_weekday <= 6
  ) {
    const day = WEEKDAY_SHORT[ev.recurrence_weekday];
    if (ev.next_list_date) {
      const next = new Date(ev.next_list_date + "T12:00:00");
      const nextStr = next.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      return `Every ${day} · Next ${nextStr}`;
    }
    return `Every ${day}`;
  }
  return shortEventDates(ev.event_date, ev.end_date);
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
  towns = [],
  recentPosts = [],
  discoveryTags = [],
}: Props) {
  const isAreasLike = browseMode === "areas" || browseMode === "access";
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
          : isAreasLike
            ? browseAreas.length
            : (results.total_results ?? results.recommendations.length);

  const totalPages = Math.ceil(totalResults / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;

  const paginatedBusiness = results.recommendations;
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
          : browseMode === "access"
            ? `${totalResults} landmarks & parks`
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
          : isAreasLike
            ? paginatedAreas.length > 0
            : paginatedBusiness.length > 0;

  // Check if a discovery tag is active in the current query
  const activeDiscoveryTag = discoveryTags.find(
    (tag) => q.toLowerCase().includes(tag.name.toLowerCase()) ||
             initialQuery.toLowerCase().includes(tag.name.toLowerCase())
  );

  const handleDiscoveryTagClick = (tag: DiscoveryTag) => {
    const newQuery = tag.name.toLowerCase() + " 30A";
    setQ(newQuery);
    const params = new URLSearchParams(searchParams.toString());
    params.set("q", newQuery);
    params.delete("page");
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      {/* Editorial search header */}
      {browseMode === "business" ? (
        <div className="sticky top-[var(--site-header-offset)] z-30 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 py-4 backdrop-blur-md">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            {/* Discovery chips - horizontal scroll */}
            <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-1">
              {/* Price filter - subtle */}
              <div className="flex shrink-0 items-center gap-1 rounded-full border border-[var(--color-border)] p-0.5">
                {[1, 2, 3, 4].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePrice(p)}
                    className={`h-7 w-8 rounded-full text-xs font-medium transition-all ${
                      activePrice === p.toString()
                        ? "bg-[var(--color-primary)] text-white"
                        : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
                    }`}
                  >
                    {"$".repeat(p)}
                  </button>
                ))}
              </div>

              {/* Divider */}
              {discoveryTags.length > 0 && (
                <div className="h-5 w-px shrink-0 bg-[var(--color-border)]" />
              )}

              {/* Discovery tags as editorial prompts */}
              {discoveryTags.map((tag) => (
                <button
                  key={tag.slug}
                  type="button"
                  onClick={() => handleDiscoveryTagClick(tag)}
                  className={`discovery-chip ${
                    activeDiscoveryTag?.slug === tag.slug ? "discovery-chip-active" : ""
                  }`}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 lg:flex-row">
            {/* Main content - wider on desktop */}
            <div className="flex-1 lg:w-3/4">
              {/* Editorial heading */}
              <div className="mb-8">
                <p className="text-eyebrow mb-2">
                  {browseMode === "business"
                    ? (townName ? `Discovering ${townName}` : "Local Businesses")
                    : browseMode === "events"
                      ? "Upcoming Events"
                      : browseMode === "guides"
                        ? "Editorial Guides"
                        : "Explore"}
                </p>
                <h1 className="text-editorial-headline text-3xl text-[var(--color-text-primary)] sm:text-4xl">
                  {browseMode === "business"
                    ? `${totalResults} ${totalResults === 1 ? "business" : "businesses"}`
                    : headingSecondary}
                </h1>
                {(() => {
                  if (!results.summary) return null;
                  let summaryText = results.summary;
                  if (browseMode === "business") {
                    // Keep the count/wording in sync with header total.
                    summaryText = summaryText
                      .replace(/Found\s+\d+\s+local\s+matches/i, `Found ${totalResults} local businesses`)
                      .replace(/\bfavorites\b/gi, "businesses")
                      .replace(/\bfavorite\b/gi, "business");
                  }
                  return (
                  <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[var(--color-text-secondary)]">
                    {summaryText}
                  </p>
                  );
                })()}
              </div>

              {hasRows ? (
                <div className="space-y-4">
                  {browseMode === "business"
                    ? paginatedBusiness.map((rec) => {
                        const img = rec.business.image_url || rec.business.hero_image_url;
                        return (
                          <article
                            key={rec.business_id}
                            className="editorial-card group overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
                          >
                            <Link
                              href={`/business/${rec.business.slug}`}
                              className="card-horizontal"
                            >
                              {/* Portrait image - left side */}
                              <div className="card-horizontal-image aspect-portrait">
                                <RemoteCoverImage
                                  src={img}
                                  alt={rec.business.name}
                                  className="img-editorial-fast object-cover"
                                  sizes="(max-width: 640px) 140px, 200px"
                                  placeholderIcon="storefront"
                                />
                              </div>

                              {/* Content - right side */}
                              <div className="card-horizontal-content p-4 sm:p-5">
                                {/* Meta line */}
                                <div className="mb-1 flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
                                  {rec.business.town_name && (
                                    <span className="font-medium">{rec.business.town_name}</span>
                                  )}
                                  {rec.business.price_level && rec.business.town_name && (
                                    <span>·</span>
                                  )}
                                  {rec.business.price_level && (
                                    <span>{"$".repeat(rec.business.price_level)}</span>
                                  )}
                                </div>

                                {/* Title */}
                                <h2 className="font-headline text-lg font-bold leading-tight text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-primary)] sm:text-xl">
                                  {rec.business.name}
                                </h2>

                                {/* Editorial description */}
                                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:line-clamp-3">
                                  {rec.explanation ||
                                    rec.business.ai_summary ||
                                    "Discover this local gem on 30A."}
                                </p>

                                {/* Tags as editorial badges */}
                                {(() => {
                                  const highlights = [
                                    ...(rec.highlighted_tags ?? []),
                                    ...(rec.business.tags ?? []),
                                  ];
                                  const unique = [...new Set(highlights)].slice(0, 3);
                                  if (unique.length === 0) return null;
                                  return (
                                  <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                                    {unique.map((tag) => (
                                      <span
                                        key={tag}
                                        className="rounded-full bg-[var(--color-surface-secondary)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-secondary)]"
                                      >
                                        {tag.replace(/_/g, " ")}
                                      </span>
                                    ))}
                                  </div>
                                  );
                                })()}
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
                          className="editorial-card group overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
                        >
                          <Link
                            href={`/events/${ev.slug}`}
                            className="card-horizontal"
                          >
                            <div className="card-horizontal-image aspect-portrait">
                              <RemoteCoverImage
                                src={ev.hero_image_url}
                                alt=""
                                className="img-editorial-fast object-cover"
                                sizes="(max-width: 640px) 140px, 200px"
                                placeholderIcon="event"
                              />
                            </div>
                            <div className="card-horizontal-content p-4 sm:p-5">
                              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                                {formatEventBrowseWhen(ev)}
                              </p>
                              <h2 className="font-headline text-lg font-bold leading-tight text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-primary)] sm:text-xl">
                                {ev.title}
                              </h2>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
                                {ev.town_name && <span>{ev.town_name}</span>}
                                {ev.venue_name && ev.town_name && <span>·</span>}
                                {ev.venue_name && <span>{ev.venue_name}</span>}
                                {ev.price && <span className="font-medium text-[var(--color-text-secondary)]">{ev.price}</span>}
                              </div>
                              {ev.description && (
                                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:line-clamp-3">
                                  {ev.description}
                                </p>
                              )}
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

                  {isAreasLike
                    ? paginatedAreas.map((a) => {
                        const inner = (
                          <>
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-secondary)] text-[var(--color-primary)]">
                              <span className="material-symbols-outlined text-3xl">explore</span>
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                                {areaTypeLabel(a.area_type)}
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
                          className="editorial-card group overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
                        >
                          <Link href={`/guide/${g.slug}`} className="card-horizontal">
                            <div className="card-horizontal-image aspect-portrait">
                              <RemoteCoverImage
                                src={g.og_image_url}
                                alt=""
                                className="img-editorial-fast object-cover"
                                sizes="(max-width: 640px) 140px, 200px"
                                placeholderIcon="menu_book"
                              />
                            </div>
                            <div className="card-horizontal-content p-4 sm:p-5">
                              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                                Guide
                              </p>
                              <h2 className="font-headline text-lg font-bold leading-tight text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-primary)] sm:text-xl">
                                {g.title}
                              </h2>
                              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:line-clamp-3">
                                {g.excerpt || g.seo_description || "Local guide to 30A towns, favorites, and trip ideas."}
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

            {/* Minimal sidebar */}
            <aside className="hidden lg:block lg:w-1/4">
              <div className="space-y-6">
                {/* Towns - clean list */}
                {towns.length > 0 && (
                  <div>
                    <h3 className="text-eyebrow mb-4">Explore Towns</h3>
                    <ul className="space-y-2">
                      {towns.map((town) => (
                        <li key={town.slug}>
                          <Link
                            href={`/${town.slug}`}
                            className="group flex items-center gap-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-primary)]"
                          >
                            <span className="material-symbols-outlined !text-base text-[var(--color-text-tertiary)] group-hover:text-[var(--color-primary)]">
                              place
                            </span>
                            {town.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recent discoveries - minimal */}
                {recentPosts.length > 0 && (
                  <div className="border-t border-[var(--color-border)] pt-6">
                    <h3 className="text-eyebrow mb-4">Recently Added</h3>
                    <ul className="space-y-3">
                      {recentPosts.slice(0, 4).map((post) => (
                        <li key={post.id}>
                          <Link
                            href={`/business/${post.slug}`}
                            className="group block text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:text-[var(--color-primary)]"
                          >
                            {post.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
