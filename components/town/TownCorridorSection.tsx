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
      className={`relative shrink-0 overflow-hidden rounded-full bg-zinc-200 ${dim} ${
        bordered ? "ring-[3px] ring-[var(--color-primary)] ring-offset-2 ring-offset-[var(--color-background)]" : ""
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

/** Horizontal 30A corridor neighbor timeline for town detail pages. */
export function TownCorridorSection({ current, west, east }: Props) {
  const currentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = currentRef.current;
    if (!node) return;
    // Center the current town on narrow viewports (scroll-snap strip).
    node.scrollIntoView({ inline: "center", block: "nearest", behavior: "auto" });
  }, []);

  const nodes: Array<
    | { kind: "current"; town: TownCorridorCurrent }
    | { kind: "neighbor"; town: TownCorridorNeighbor }
  > = [
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

      <div
        className="mt-5 -mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] snap-x snap-mandatory md:mx-0 md:overflow-visible md:px-0 md:snap-none [&::-webkit-scrollbar]:hidden"
      >
        <div className="relative mx-auto flex w-max min-w-full items-start justify-center gap-6 px-2 sm:gap-8 md:w-full md:justify-between md:gap-4 md:px-0">
          {/* Corridor spine */}
          <div
            className="pointer-events-none absolute left-4 right-4 top-[4.25rem] h-px bg-zinc-300 sm:top-[4.75rem] md:left-8 md:right-8"
            aria-hidden
          />

          {nodes.map((node) => {
            if (node.kind === "current") {
              return (
                <div
                  key={`current-${node.town.id}`}
                  ref={currentRef}
                  className="relative z-[1] flex w-24 shrink-0 snap-center scroll-mx-6 flex-col items-center text-center sm:w-28 md:w-auto md:min-w-0 md:flex-1"
                >
                  <p className="mb-2 line-clamp-2 min-h-[2.5rem] text-sm font-bold text-[var(--color-primary)] sm:min-h-[2.75rem] sm:text-base">
                    {node.town.name}
                  </p>
                  <div className="town-corridor-current origin-center">
                    <TownThumb
                      name={node.town.name}
                      imageUrl={node.town.imageUrl}
                      size="lg"
                      bordered
                      showPin
                    />
                  </div>
                  <p className="mt-2.5 text-[0.65rem] font-bold uppercase tracking-wider text-[var(--color-primary)] sm:text-xs">
                    You are here
                  </p>
                </div>
              );
            }

            const { town } = node;
            return (
              <Link
                key={`${town.direction}-${town.id}`}
                href={townPagePath(town.slug)}
                className="relative z-[1] flex w-24 shrink-0 snap-center scroll-mx-6 flex-col items-center text-center transition-opacity hover:opacity-80 sm:w-28 md:w-auto md:min-w-0 md:flex-1"
              >
                <p className="mb-2 line-clamp-2 min-h-[2.5rem] text-sm font-medium text-[var(--color-primary)] sm:min-h-[2.75rem] sm:text-base">
                  {town.name}
                </p>
                <TownThumb name={town.name} imageUrl={town.imageUrl} size="sm" />
                <p className="mt-2.5 text-[0.65rem] leading-snug text-zinc-500 sm:text-xs">
                  {formatMilesLabel(town.miles, town.direction)}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
