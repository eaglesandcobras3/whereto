"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { townPagePath } from "@/lib/routes/town-page-path";
import type {
  TownCorridorCurrent,
  TownCorridorNeighbor,
} from "@/lib/data/town-relationships";

type Props = {
  current: TownCorridorCurrent;
  west: TownCorridorNeighbor[];
  east: TownCorridorNeighbor[];
};

function formatMilesLabel(miles: number, direction: "west" | "east"): string {
  return `${miles.toFixed(1)} miles ${direction}`;
}

function formatMilesLabelCompact(miles: number, direction: "west" | "east"): string {
  return `${miles.toFixed(1)} mi ${direction === "west" ? "W" : "E"}`;
}

function TownThumb({
  name,
  imageUrl,
  size,
  bordered,
  showPin,
}: {
  name: string;
  imageUrl: string | null;
  size: "sm" | "lg";
  bordered?: boolean;
  showPin?: boolean;
}) {
  const dim = size === "lg" ? "h-16 w-16 sm:h-20 sm:w-20" : "h-12 w-12 sm:h-14 sm:w-14";
  return (
    <div
      className={`relative z-[1] shrink-0 overflow-hidden rounded-full bg-zinc-200 ${dim} ${
        bordered
          ? "ring-[3px] ring-[var(--color-primary)] ring-offset-2 ring-offset-[var(--color-background)]"
          : ""
      }`}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-zinc-400">
          <span className="material-symbols-outlined !text-xl" aria-hidden>
            location_city
          </span>
        </div>
      )}
      {showPin ? (
        <span
          className="absolute inset-0 flex items-center justify-center bg-[var(--color-primary)]/35"
          aria-hidden
        >
          <span className="material-symbols-outlined !text-2xl text-white drop-shadow-sm sm:!text-3xl">
            location_on
          </span>
        </span>
      ) : null}
      <span className="sr-only">{name}</span>
    </div>
  );
}

type CorridorNode =
  | { kind: "current"; town: TownCorridorCurrent }
  | { kind: "neighbor"; town: TownCorridorNeighbor };

/** Horizontal 30A corridor neighbor timeline for town detail pages. */
export function TownCorridorSection({ current, west, east }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollHints = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const max = scroller.scrollWidth - scroller.clientWidth;
    const overflowing = max > 1;
    setCanScrollLeft(overflowing && scroller.scrollLeft > 2);
    setCanScrollRight(overflowing && scroller.scrollLeft < max - 2);
  }, []);

  const centerCurrent = useCallback(() => {
    const scroller = scrollerRef.current;
    const node = currentRef.current;
    if (!scroller || !node) return;
    if (scroller.scrollWidth <= scroller.clientWidth + 1) {
      scroller.scrollLeft = 0;
      updateScrollHints();
      return;
    }
    const target = node.offsetLeft - scroller.clientWidth / 2 + node.offsetWidth / 2;
    scroller.scrollLeft = Math.max(0, target);
    updateScrollHints();
  }, [updateScrollHints]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const node = currentRef.current;
    if (!scroller || !node) return;

    centerCurrent();

    const ro = new ResizeObserver(() => {
      centerCurrent();
    });
    ro.observe(scroller);
    ro.observe(node);

    scroller.addEventListener("scroll", updateScrollHints, { passive: true });
    return () => {
      ro.disconnect();
      scroller.removeEventListener("scroll", updateScrollHints);
    };
  }, [centerCurrent, updateScrollHints]);

  // Trackpads scroll horizontally; mouse wheels are vertical — map vertical wheel to x when overflowing.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    function onWheel(e: WheelEvent) {
      if (!scroller) return;
      if (scroller.scrollWidth <= scroller.clientWidth + 1) return;
      // Prefer native horizontal deltas (shift+wheel / trackpad).
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (e.deltaY === 0) return;
      e.preventDefault();
      scroller.scrollLeft += e.deltaY;
      updateScrollHints();
    }

    scroller.addEventListener("wheel", onWheel, { passive: false });
    return () => scroller.removeEventListener("wheel", onWheel);
  }, [updateScrollHints]);

  function scrollByPage(direction: -1 | 1) {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const amount = Math.max(160, Math.round(scroller.clientWidth * 0.55));
    scroller.scrollBy({ left: direction * amount, behavior: "smooth" });
  }

  const nodes: CorridorNode[] = [
    ...west.map((town) => ({ kind: "neighbor" as const, town })),
    { kind: "current", town: current },
    ...east.map((town) => ({ kind: "neighbor" as const, town })),
  ];

  return (
    <section
      className="animate-fade-in-up mb-8 sm:mb-10"
      aria-labelledby="town-corridor-heading"
    >
      <h2
        id="town-corridor-heading"
        className="text-center text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-[var(--color-primary)] sm:text-xs"
      >
        The 30A Corridor
      </h2>

      <div className="relative mt-5">
        {canScrollLeft ? (
          <button
            type="button"
            aria-label="Scroll to western towns"
            onClick={() => scrollByPage(-1)}
            className="absolute top-1/2 left-0 z-10 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm hover:bg-[var(--color-surface-secondary)] md:flex"
          >
            <span className="material-symbols-outlined !text-xl" aria-hidden>
              chevron_left
            </span>
          </button>
        ) : null}
        {canScrollRight ? (
          <button
            type="button"
            aria-label="Scroll to eastern towns"
            onClick={() => scrollByPage(1)}
            className="absolute top-1/2 right-0 z-10 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm hover:bg-[var(--color-surface-secondary)] md:flex"
          >
            <span className="material-symbols-outlined !text-xl" aria-hidden>
              chevron_right
            </span>
          </button>
        ) : null}

        <div
          ref={scrollerRef}
          className="overflow-x-auto overscroll-x-contain px-1 pb-2 [-ms-overflow-style:auto] [scrollbar-gutter:stable] [scrollbar-width:thin] snap-x snap-mandatory md:px-10"
        >
          {/* Fixed column widths at all sizes so the strip overflows and can scroll on small desktops. */}
          <div className="relative mx-auto flex w-max items-start justify-center gap-6 px-2 sm:gap-8 md:gap-6">
            <div
              className="pointer-events-none absolute top-[calc(2.5rem+0.5rem+2rem)] right-6 left-6 h-px bg-zinc-300 sm:top-[calc(2.75rem+0.5rem+2.5rem)]"
              aria-hidden
            />

            {nodes.map((node) => {
              const isCurrent = node.kind === "current";
              const town = node.town;
              const columnClass =
                "relative z-[1] flex w-24 shrink-0 snap-center scroll-mx-6 flex-col items-center text-center sm:w-28 md:w-32";

              const nameEl = (
                <p
                  className={`mb-2 line-clamp-2 min-h-[2.5rem] text-sm sm:min-h-[2.75rem] sm:text-base ${
                    isCurrent
                      ? "font-bold text-[var(--color-primary)]"
                      : "font-medium text-[var(--color-primary)]"
                  }`}
                >
                  {town.name}
                </p>
              );

              const thumbEl = (
                <div className="flex h-16 items-center justify-center sm:h-20">
                  {isCurrent ? (
                    <div className="town-corridor-current">
                      <TownThumb
                        name={town.name}
                        imageUrl={town.imageUrl}
                        size="lg"
                        bordered
                        showPin
                      />
                    </div>
                  ) : (
                    <TownThumb name={town.name} imageUrl={town.imageUrl} size="sm" />
                  )}
                </div>
              );

              if (isCurrent) {
                return (
                  <div key={`current-${town.id}`} ref={currentRef} className={columnClass}>
                    {nameEl}
                    {thumbEl}
                    <p className="mt-2.5 text-[0.65rem] font-bold uppercase tracking-wider text-[var(--color-primary)] sm:text-xs">
                      You are here
                    </p>
                  </div>
                );
              }

              const neighbor = town as TownCorridorNeighbor;
              return (
                <Link
                  key={`${neighbor.direction}-${neighbor.id}`}
                  href={townPagePath(neighbor.slug)}
                  className={`${columnClass} transition-opacity hover:opacity-80`}
                >
                  {nameEl}
                  {thumbEl}
                  <p className="mt-2.5 text-[0.65rem] leading-snug text-zinc-500 sm:text-xs">
                    <span className="md:hidden">
                      {formatMilesLabelCompact(neighbor.miles, neighbor.direction)}
                    </span>
                    <span className="hidden md:inline">
                      {formatMilesLabel(neighbor.miles, neighbor.direction)}
                    </span>
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
