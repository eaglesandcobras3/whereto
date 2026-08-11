"use client";

import { useEffect, useId, useRef, useState } from "react";
import { BUSINESS_NAME_SEARCH_DEBOUNCE_MS } from "@/lib/listing-requests/business-name-search-debounce";

export type BusinessSearchHit = {
  id: string;
  title: string;
  slug: string;
  town_title: string | null;
};

export { BUSINESS_NAME_SEARCH_DEBOUNCE_MS };

type Props = {
  value: string;
  maxLength: number;
  inputClassName: string;
  onQueryChange: (value: string) => void;
  onSelectBusiness: (hit: BusinessSearchHit) => void;
  onAddNew: (title: string) => void;
  disabled?: boolean;
  /** Override for tests. */
  debounceMs?: number;
};

/**
 * Combobox for finding an existing listing or explicitly adding a new one.
 * Search requests are debounced and in-flight fetches are aborted on each keystroke.
 */
export function BusinessNameTypeahead({
  value,
  maxLength,
  inputClassName,
  onQueryChange,
  onSelectBusiness,
  onAddNew,
  disabled = false,
  debounceMs = BUSINESS_NAME_SEARCH_DEBOUNCE_MS,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<BusinessSearchHit[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [debouncedQuery, setDebouncedQuery] = useState(() => value.trim());

  // Debounce the query string; abort happens in the fetch effect cleanup.
  useEffect(() => {
    const next = value.trim();
    const timer = window.setTimeout(() => {
      setDebouncedQuery(next);
    }, debounceMs);
    return () => window.clearTimeout(timer);
  }, [value, debounceMs]);

  // Fetch only after debounce settles.
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    setLoading(true);

    void (async () => {
      try {
        const res = await fetch(
          `/api/listing-requests/business-search?q=${encodeURIComponent(debouncedQuery)}`,
          { signal: controller.signal },
        );
        const j = (await res.json()) as {
          businesses?: BusinessSearchHit[];
          error?: string;
        };
        if (!res.ok) throw new Error(j.error ?? "Search failed");
        if (controller.signal.aborted || requestId !== requestIdRef.current) return;
        setHits(j.businesses ?? []);
        setActiveIndex(-1);
        setOpen(true);
      } catch {
        if (controller.signal.aborted || requestId !== requestIdRef.current) return;
        setHits([]);
      } finally {
        if (!controller.signal.aborted && requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [debouncedQuery]);

  useEffect(() => {
    function onDocPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocPointer);
    return () => document.removeEventListener("mousedown", onDocPointer);
  }, []);

  const canAddNew = value.trim().length > 0;
  const optionCount = hits.length + (canAddNew ? 1 : 0);
  const awaitingDebounce =
    value.trim().length >= 2 && value.trim() !== debouncedQuery;

  function selectHit(hit: BusinessSearchHit) {
    onSelectBusiness(hit);
    setOpen(false);
  }

  function selectAddNew() {
    onAddNew(value.trim());
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp") && optionCount > 0) {
      setOpen(true);
      e.preventDefault();
      return;
    }
    if (!open) return;

    if (e.key === "Escape") {
      setOpen(false);
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % optionCount);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? optionCount - 1 : i - 1));
      return;
    }
    if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      if (activeIndex < hits.length) {
        selectHit(hits[activeIndex]);
      } else if (canAddNew) {
        selectAddNew();
      }
    }
  }

  const showSearching = loading || awaitingDebounce;

  return (
    <div ref={rootRef} className="relative mt-1.5">
      <input
        id="title"
        name="title"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-busy={showSearching || undefined}
        aria-activedescendant={
          activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined
        }
        required
        disabled={disabled}
        maxLength={maxLength}
        value={value}
        autoComplete="off"
        placeholder="Start typing to find your listing…"
        onChange={(e) => {
          onQueryChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (value.trim().length >= 2 || hits.length > 0) setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className={inputClassName}
      />
      {open && (showSearching || hits.length > 0 || canAddNew) ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] py-1 shadow-lg"
        >
          {showSearching && hits.length === 0 ? (
            <li className="px-3 py-2 text-sm text-[var(--color-text-tertiary)]">Searching…</li>
          ) : null}
          {hits.map((hit, index) => {
            const active = index === activeIndex;
            return (
              <li
                key={hit.id}
                id={`${listId}-opt-${index}`}
                role="option"
                aria-selected={active}
                className={`cursor-pointer px-3 py-2.5 text-sm ${
                  active
                    ? "bg-[var(--color-primary)]/10 text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)]"
                }`}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectHit(hit);
                }}
              >
                <span className="font-medium">{hit.title}</span>
                {hit.town_title ? (
                  <span className="mt-0.5 block text-xs text-[var(--color-text-tertiary)]">
                    {hit.town_title}
                  </span>
                ) : null}
              </li>
            );
          })}
          {canAddNew ? (
            <li
              id={`${listId}-opt-${hits.length}`}
              role="option"
              aria-selected={activeIndex === hits.length}
              className={`cursor-pointer border-t border-[var(--color-border)] px-3 py-2.5 text-sm ${
                activeIndex === hits.length
                  ? "bg-[var(--color-primary)]/10 text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
              }`}
              onMouseEnter={() => setActiveIndex(hits.length)}
              onMouseDown={(e) => {
                e.preventDefault();
                selectAddNew();
              }}
            >
              Add &ldquo;{value.trim()}&rdquo; as a new listing
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
