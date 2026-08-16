"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { DiscoverListingRow } from "@/lib/discovery-filters/types";

const INITIAL_BATCH = 8;
const BATCH_SIZE = 8;

type Props = {
  listings: DiscoverListingRow[];
  /** Soften the list while a refetch is in flight. */
  refreshing?: boolean;
  renderItem: (listing: DiscoverListingRow) => ReactNode;
};

/**
 * Renders discover result cards in batches as the user scrolls,
 * so the first paint stays light even with map page sizes (up to 48).
 */
export function DiscoverResultsList({
  listings,
  refreshing = false,
  renderItem,
}: Props) {
  const [visibleCount, setVisibleCount] = useState(() =>
    Math.min(INITIAL_BATCH, listings.length),
  );
  const sentinelRef = useRef<HTMLLIElement | null>(null);
  const listingsKey = listings.map((l) => l.id).join("|");

  useEffect(() => {
    setVisibleCount(Math.min(INITIAL_BATCH, listings.length));
  }, [listingsKey, listings.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || visibleCount >= listings.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, listings.length));
      },
      { rootMargin: "240px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, listings.length, listingsKey]);

  const visible = listings.slice(0, visibleCount);
  const hasMore = visibleCount < listings.length;

  return (
    <ul
      className={`flex flex-col gap-4 transition-opacity duration-200 ${
        refreshing ? "opacity-55" : "opacity-100"
      }`}
      aria-busy={refreshing || undefined}
    >
      {visible.map((listing) => (
        <li key={listing.id} className="h-full [content-visibility:auto] [contain-intrinsic-size:auto_12rem]">
          {renderItem(listing)}
        </li>
      ))}
      {hasMore ? (
        <li
          ref={sentinelRef}
          className="flex items-center justify-center gap-2 py-4 text-sm text-[var(--color-text-tertiary)]"
          aria-hidden
        >
          <span
            className="inline-block size-3.5 animate-spin rounded-full border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)]"
          />
          Loading more…
        </li>
      ) : null}
    </ul>
  );
}
