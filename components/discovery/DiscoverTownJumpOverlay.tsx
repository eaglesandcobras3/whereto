"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export type DiscoverTownJumpOption = {
  slug: string;
  label: string;
};

type Props = {
  towns: DiscoverTownJumpOption[];
  /** Town used for the last jump (URL label) — not a hard filter. */
  activeTownSlug?: string | null;
  onJump: (slug: string) => void;
  onClear: () => void;
};

/**
 * Map-only control: open a panel, pick a town, fly the viewport there.
 * Intentionally not a results filter — bbox / Search this area owns geography.
 */
export function DiscoverTownJumpOverlay({
  towns,
  activeTownSlug = null,
  onJump,
  onClear,
}: Props) {
  const panelId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);

  const activeTown = useMemo(
    () => towns.find((t) => t.slug === activeTownSlug) ?? null,
    [activeTownSlug, towns],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return towns.slice(0, 8);
    return towns
      .filter(
        (t) =>
          t.label.toLowerCase().includes(needle) ||
          t.slug.replace(/_/g, " ").includes(needle),
      )
      .slice(0, 8);
  }, [query, towns]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setHighlightIndex(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [query]);

  const close = () => setOpen(false);

  const pick = (slug: string) => {
    onJump(slug);
    setOpen(false);
  };

  return (
    <div className="pointer-events-none absolute left-3 top-3 z-[510] flex max-w-[min(100%-1.5rem,18rem)] flex-col items-start gap-2">
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Jump to town"
          className="pointer-events-auto w-[min(100vw-1.5rem,18rem)] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 shadow-lg backdrop-blur-md"
        >
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3 py-2">
            <span
              className="material-symbols-outlined text-[var(--color-primary)] !text-lg"
              aria-hidden
            >
              near_me
            </span>
            <p className="min-w-0 flex-1 text-sm font-semibold text-[var(--color-text-primary)]">
              Jump to town
            </p>
            <button
              type="button"
              onClick={close}
              className="rounded-md p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
              aria-label="Close"
            >
              <span className="material-symbols-outlined !text-lg" aria-hidden>
                close
              </span>
            </button>
          </div>

          <div className="p-2">
            <label htmlFor={`${panelId}-input`} className="sr-only">
              Town name
            </label>
            <input
              ref={inputRef}
              id={`${panelId}-input`}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search towns…"
              className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none ring-[var(--color-primary)] focus:ring-2"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  close();
                  return;
                }
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlightIndex((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
                  return;
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlightIndex((i) => Math.max(i - 1, 0));
                  return;
                }
                if (e.key === "Enter" && filtered[highlightIndex]) {
                  e.preventDefault();
                  pick(filtered[highlightIndex].slug);
                }
              }}
            />
          </div>

          <ul className="max-h-56 overflow-y-auto pb-2" role="listbox">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-[var(--color-text-tertiary)]">
                No towns match
              </li>
            ) : (
              filtered.map((town, index) => {
                const active = town.slug === activeTownSlug;
                const highlighted = index === highlightIndex;
                return (
                  <li key={town.slug} role="option" aria-selected={active}>
                    <button
                      type="button"
                      onMouseEnter={() => setHighlightIndex(index)}
                      onClick={() => pick(town.slug)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                        highlighted
                          ? "bg-[var(--color-primary)]/10 text-[var(--color-text-primary)]"
                          : "text-[var(--color-text-secondary)]"
                      }`}
                    >
                      <span
                        className="material-symbols-outlined !text-base text-[var(--color-primary)]"
                        aria-hidden
                      >
                        location_on
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium">{town.label}</span>
                      {active ? (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                          Current
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : (
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={false}
            aria-controls={panelId}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/95 px-3 py-1.5 text-sm font-semibold text-[var(--color-text-primary)] shadow-md backdrop-blur-md hover:border-[var(--color-primary)]/40"
          >
            <span className="material-symbols-outlined !text-base text-[var(--color-primary)]" aria-hidden>
              near_me
            </span>
            Jump to town
          </button>

          {activeTown ? (
            <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/95 py-1 pl-2.5 pr-1 text-xs font-medium text-[var(--color-text-secondary)] shadow-md backdrop-blur-md">
              <span className="truncate">{activeTown.label}</span>
              <button
                type="button"
                onClick={onClear}
                className="rounded-full p-0.5 hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
                aria-label={`Clear ${activeTown.label} jump`}
              >
                <span className="material-symbols-outlined !text-sm" aria-hidden>
                  close
                </span>
              </button>
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
