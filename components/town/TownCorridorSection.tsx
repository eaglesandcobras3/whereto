"use client";

import { useEffect, useRef } from "react";
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
  const currentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = currentRef.current;
    if (!node) return;
    // Center the current town on narrow viewports (scroll-snap strip).
    node.scrollIntoView({ inline: "center", block: "nearest", behavior: "auto" });
  }, []);

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

      <div className="mt-5 -mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] snap-x snap-mandatory md:mx-0 md:overflow-visible md:px-0 md:snap-none [&::-webkit-scrollbar]:hidden">
        <div className="relative mx-auto flex w-max min-w-full items-start justify-center gap-6 px-2 sm:gap-8 md:w-full md:justify-between md:gap-4 md:px-0">
          {/* Spine through the shared circle row (names are min-h + mb-2 above) */}
          <div
            className="pointer-events-none absolute top-[calc(2.5rem+0.5rem+2rem)] right-6 left-6 h-px bg-zinc-300 sm:top-[calc(2.75rem+0.5rem+2.5rem)] md:right-10 md:left-10"
            aria-hidden
          />

          {nodes.map((node) => {
            const isCurrent = node.kind === "current";
            const town = node.town;
            const columnClass =
              "relative z-[1] flex w-24 shrink-0 snap-center scroll-mx-6 flex-col items-center text-center sm:w-28 md:w-auto md:min-w-0 md:flex-1";

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
                  {formatMilesLabel(neighbor.miles, neighbor.direction)}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
