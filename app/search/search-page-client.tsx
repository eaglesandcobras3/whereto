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

type Props = {
  initialQuery: string;
  results: SearchResultPayload;
  townName?: string;
  footer?: React.ReactNode;
  towns?: Town[];
  recentPosts?: RecentPost[];
};

export function SearchPageClient({ initialQuery, results, townName, footer, towns = [], recentPosts = [] }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);

  const activePrice = searchParams.get("price");
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const urlQ = searchParams.get("q");

  // Sync internal search input with URL if it changes (e.g. back button)
  const [lastUrlQ, setLastUrlQ] = useState(urlQ);
  if (urlQ !== lastUrlQ) {
    setLastUrlQ(urlQ);
    setQ(urlQ || "");
    setIsSearching(false);
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    setIsSearching(true);
    const params = new URLSearchParams(searchParams.toString());
    params.set("q", q.trim());
    params.delete("page"); // Reset to page 1 on new search
    router.push(`/search?${params.toString()}`);
  };

  const togglePrice = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (activePrice === p.toString()) {
      params.delete("price");
    } else {
      params.set("price", p.toString());
    }
    params.delete("page"); // Reset to page 1 on filter change
    router.push(`/search?${params.toString()}`);
  };

  // Pagination
  const totalResults = results.recommendations.length;
  const totalPages = Math.ceil(totalResults / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedResults = results.recommendations.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page === 1) {
      params.delete("page");
    } else {
      params.set("page", page.toString());
    }
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      {/* Filter / Search Bar Header */}
      <div className="sticky top-16 z-30 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 py-4 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <SearchBar
                value={q}
                onChange={setQ}
                onSubmit={handleSearch}
                loading={isSearching}
                variant="compact"
                placeholder="Search anything on 30A..."
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
              {/* Price Filters */}
              <div className="flex items-center gap-1 rounded-full bg-[var(--color-surface-secondary)] p-1">
                {[1, 2, 3, 4].map((p) => (
                  <button
                    key={p}
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
          </div>
        </div>
      </div>

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex flex-col gap-8 lg:flex-row">
            {/* Main Content - 2/3 width */}
            <div className="flex-1 lg:w-2/3">
              {/* Results Header */}
              <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-3xl">
                  {totalResults} results for &ldquo;{initialQuery}&rdquo;
                  {townName && <span className="text-[var(--color-text-secondary)]"> in {townName}</span>}
                </h1>
                {results.summary && (
                  <p className="mt-3 text-base text-[var(--color-text-secondary)] leading-relaxed">
                    {results.summary}
                  </p>
                )}
              </div>

              {/* Results List - Blog Style */}
              {paginatedResults.length > 0 ? (
                <div className="space-y-6">
                  {paginatedResults.map((rec) => (
                    <article
                      key={rec.business_id}
                      className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-all hover:border-[var(--color-border-strong)] hover:shadow-md sm:p-6"
                    >
                      <Link href={`/business/${rec.business.slug}`} className="flex flex-col gap-4 sm:flex-row sm:gap-6">
                        {/* Image */}
                        <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-lg bg-[var(--color-surface-secondary)] sm:aspect-[4/3] sm:w-40">
                          {rec.business.hero_image_url ? (
                            <Image
                              src={rec.business.hero_image_url}
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

                        {/* Content */}
                        <div className="flex flex-1 flex-col">
                          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors">
                            {rec.business.name}
                          </h2>

                          {/* Meta info */}
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                            {rec.business.price_level && (
                              <span className="font-medium text-[var(--color-text-tertiary)]">
                                {"$".repeat(rec.business.price_level)}
                              </span>
                            )}
                            {rec.business.town_name && (
                              <>
                                <span className="text-[var(--color-text-tertiary)]">·</span>
                                <span>{rec.business.town_name}</span>
                              </>
                            )}
                          </div>

                          {/* Description */}
                          <p className="mt-2 text-sm text-[var(--color-text-secondary)] leading-relaxed line-clamp-2">
                            {rec.explanation || rec.business.ai_summary || "Discover this local gem on 30A."}
                          </p>

                          {/* Tags */}
                          {rec.business.tags && rec.business.tags.length > 0 && (
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
                          )}
                        </div>
                      </Link>
                    </article>
                  ))}
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

              {/* Pagination */}
              {totalPages > 1 && (
                <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
                  <button
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
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(page - currentPage) <= 1;

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
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-secondary)] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Next page"
                  >
                    <span className="material-symbols-outlined text-xl">chevron_right</span>
                  </button>
                </nav>
              )}

              {/* Results count */}
              {totalResults > 0 && (
                <p className="mt-4 text-center text-sm text-[var(--color-text-tertiary)]">
                  Showing {startIndex + 1}–{Math.min(endIndex, totalResults)} of {totalResults} results
                </p>
              )}
            </div>

            {/* Sidebar - 1/3 width */}
            <aside className="lg:w-1/3">
              <div className="sticky top-32 space-y-8">
                {/* Recent Posts */}
                {recentPosts.length > 0 && (
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                      Recent Posts
                    </h3>
                    <ul className="mt-4 space-y-4">
                      {recentPosts.map((post) => (
                        <li key={post.id}>
                          <Link
                            href={`/business/${post.slug}`}
                            className="group flex items-center gap-3"
                          >
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
                            <span className="text-sm font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors line-clamp-2">
                              {post.name}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Towns / Areas */}
                {towns.length > 0 && (
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                      Explore Towns
                    </h3>
                    <ul className="mt-4 space-y-2">
                      {towns.map((town) => (
                        <li key={town.slug}>
                          <Link
                            href={`/${town.slug}`}
                            className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
                          >
                            <span className="material-symbols-outlined text-base">location_on</span>
                            {town.name}
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

      {footer}
    </div>
  );
}
