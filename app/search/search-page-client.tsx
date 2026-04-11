"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { SearchBar } from "@/components/discovery/SearchBar";
import { BusinessCard } from "@/components/discovery/BusinessCard";
import { SiteFooter } from "@/components/home/SiteFooter";
import type { SearchResultPayload } from "@/lib/search/types";

type Props = {
  initialQuery: string;
  results: SearchResultPayload;
  townName?: string;
};

export function SearchPageClient({ initialQuery, results, townName }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);

  const activePrice = searchParams.get("price");
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
    // Also reset price when doing a brand new text search? (optional)
    // params.delete("price");
    router.push(`/search?${params.toString()}`);
  };


  const togglePrice = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (activePrice === p.toString()) {
      params.delete("price");
    } else {
      params.set("price", p.toString());
    }
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <Navbar compact />

      {/* Filter / Search Bar Header */}
      <div className="sticky top-16 z-30 border-b border-[var(--color-border-strong)] bg-[var(--color-surface)]/80 py-4 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 md:px-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="w-full max-w-2xl">
              <SearchBar
                value={q}
                onChange={setQ}
                onSubmit={handleSearch}
                loading={isSearching}
                variant="compact"
                placeholder="Search anything on 30A..."
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
              {/* Price Filters */}
              <div className="flex items-center gap-1 rounded-full bg-[var(--color-surface-container-high)] p-1">
                {[1, 2, 3, 4].map((p) => (
                  <button
                    key={p}
                    onClick={() => togglePrice(p)}
                    className={`h-8 w-10 rounded-full text-xs font-bold transition-all ${
                      activePrice === p.toString()
                        ? "bg-[var(--color-primary)] text-white shadow-sm"
                        : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-container-highest)]"
                    }`}
                  >
                    {"$".repeat(p)}
                  </button>
                ))}
              </div>
              <button className="pill whitespace-nowrap bg-[var(--color-surface-container-high)] text-sm font-medium hover:bg-[var(--color-surface-container-highest)]">
                Type
              </button>
              <button className="pill whitespace-nowrap bg-[var(--color-surface-container-high)] text-sm font-medium hover:bg-[var(--color-surface-container-highest)]">
                Rating
              </button>
              <button className="pill whitespace-nowrap bg-[var(--color-surface-container-high)] text-sm font-medium hover:bg-[var(--color-surface-container-highest)]">
                Open Now
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1">
        <div className="mx-auto flex h-full max-w-[1600px]">
          {/* List Side */}
          <div className="w-full flex-1 border-r border-[var(--color-border-strong)] bg-[var(--color-surface)] lg:max-w-[60%] xl:max-w-[55%]">
            <div className="px-4 py-6 md:px-8">
              <div className="mb-6">
                <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
                  {results.recommendations.length} results for &ldquo;{initialQuery}&rdquo;{townName ? ` in ${townName}` : ""}
                </h1>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  {results.summary}
                </p>
              </div>

              <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {results.recommendations.map((rec) => (
                  <BusinessCard 
                    key={rec.business_id} 
                    rec={rec} 
                    variant="consumer"
                  />
                ))}
              </ul>

              {results.recommendations.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface-container-low)] text-[var(--color-text-tertiary)]">
                    <span className="material-symbols-outlined !text-3xl">search_off</span>
                  </div>
                  <h2 className="text-lg font-bold text-[var(--color-text-primary)]">No results found</h2>
                  <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                    Try adjusting your search or filters to find what you&apos;re looking for.
                  </p>
                </div>
              )}
            </div>
            
            <SiteFooter />
          </div>

          {/* Map Side (Placeholder) */}
          <div className="sticky top-[137px] hidden h-[calc(100vh-137px)] flex-1 overflow-hidden lg:block bg-[var(--color-surface-container-low)]">
            <div className="relative h-full w-full">
              {/* Map background pattern */}
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, var(--color-primary) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
              
              <div className="flex h-full w-full flex-col items-center justify-center space-y-4 p-12 text-center">
                <div className="rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-8 shadow-premium-lg">
                  <span className="material-symbols-outlined mb-4 !text-4xl text-[var(--color-primary)]">map</span>
                  <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Interactive Map</h3>
                  <p className="mt-2 text-sm text-[var(--color-text-secondary)] max-w-xs">
                    View these {results.recommendations.length} places on our immersive coastal map.
                  </p>
                  <button className="mt-6 w-full rounded-full bg-[var(--color-primary)] py-3 text-sm font-bold text-white hover:opacity-90">
                    Enable Map View
                  </button>
                </div>
              </div>

              {/* Mock map pins */}
              <div className="absolute left-[30%] top-[40%] rounded-full bg-[var(--color-primary)] p-1.5 shadow-premium-md">
                <div className="h-2 w-2 rounded-full bg-white" />
              </div>
              <div className="absolute left-[50%] top-[25%] rounded-full bg-[var(--color-primary)] p-1.5 shadow-premium-md">
                <div className="h-2 w-2 rounded-full bg-white" />
              </div>
              <div className="absolute left-[65%] top-[60%] rounded-full bg-[var(--color-primary)] p-1.5 shadow-premium-md">
                <div className="h-2 w-2 rounded-full bg-white" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
