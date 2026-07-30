"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { DiscoverSearchTagOption } from "@/lib/discovery-filters/load-discover-options";

type Props = {
  id?: string;
  options: DiscoverSearchTagOption[];
  selectedSlugs: string[];
  onChange: (slugs: string[]) => void;
  disabled?: boolean;
  /** When total chip count reaches this, block further adds but still allow removals. */
  maxSelected?: number;
  loading?: boolean;
  placeholder?: string;
  emptyMessage?: string;
  /** Free-text suggested tags shown as distinct chips in the same control. */
  suggestedLabels?: string[];
  onSuggestedChange?: (labels: string[]) => void;
  /** Label for the empty-state suggest action. Defaults to Suggest “{query}”. */
  suggestEmptyLabel?: (query: string) => string;
};

function normalizeSuggestedLabel(raw: string): string {
  return raw.trim().slice(0, 64);
}

export function FacetTypeaheadMultiSelect({
  id,
  options,
  selectedSlugs,
  onChange,
  disabled,
  maxSelected,
  loading,
  placeholder = "Search tags…",
  emptyMessage = "No matches",
  suggestedLabels = [],
  onSuggestedChange,
  suggestEmptyLabel,
}: Props) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const suggestEnabled = typeof onSuggestedChange === "function";
  const totalSelected = selectedSlugs.length + suggestedLabels.length;
  const atMax =
    typeof maxSelected === "number" && maxSelected >= 0 && totalSelected >= maxSelected;

  const optionBySlug = useMemo(() => {
    const map = new Map<string, DiscoverSearchTagOption>();
    for (const option of options) {
      map.set(option.slug, option);
    }
    return map;
  }, [options]);

  const filteredOptions = useMemo(() => {
    if (atMax) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return options.filter((option) => {
      if (selectedSlugs.includes(option.slug)) return false;
      return (
        option.label.toLowerCase().includes(needle) ||
        option.slug.replace(/_/g, " ").includes(needle)
      );
    });
  }, [atMax, options, query, selectedSlugs]);

  const trimmedQuery = query.trim();
  const normalizedSuggest = normalizeSuggestedLabel(trimmedQuery);
  const suggestAlreadyAdded =
    normalizedSuggest.length > 0 &&
    suggestedLabels.some((label) => label.toLowerCase() === normalizedSuggest.toLowerCase());
  const canSuggest =
    suggestEnabled && !atMax && normalizedSuggest.length > 0 && !suggestAlreadyAdded;

  const showSuggestions = open && trimmedQuery.length > 0 && !atMax;
  const hasChips = selectedSlugs.length > 0 || suggestedLabels.length > 0;
  const inputDisabled = disabled || loading || options.length === 0 || atMax;

  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: MouseEvent) => {
      if (containerRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const addSlug = (slug: string) => {
    if (atMax || selectedSlugs.includes(slug)) return;
    onChange([...selectedSlugs, slug]);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  };

  const addSuggested = () => {
    if (!onSuggestedChange || !canSuggest) return;
    onSuggestedChange([...suggestedLabels, normalizedSuggest]);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  };

  const removeSlug = (slug: string) => {
    onChange(selectedSlugs.filter((s) => s !== slug));
    inputRef.current?.focus();
  };

  const removeSuggested = (label: string) => {
    if (!onSuggestedChange) return;
    onSuggestedChange(suggestedLabels.filter((l) => l !== label));
    inputRef.current?.focus();
  };

  const focusInput = () => {
    if (inputDisabled) return;
    inputRef.current?.focus();
    setOpen(true);
  };

  const emptyActionLabel =
    suggestEmptyLabel?.(normalizedSuggest) ?? `Suggest “${normalizedSuggest}”`;

  return (
    <div ref={containerRef} className="relative" aria-busy={loading || undefined}>
      <div
        className={cn(
          "flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-white px-2 py-1.5",
          disabled || loading || options.length === 0
            ? hasChips
              ? "cursor-not-allowed"
              : "cursor-not-allowed opacity-60"
            : atMax
              ? "cursor-default"
              : "cursor-text",
          open && !inputDisabled ? "ring-2 ring-[var(--color-primary)]/20" : "",
        )}
        onMouseDown={(event) => {
          if (inputDisabled) return;
          if ((event.target as HTMLElement).closest("[data-chip-remove]")) return;
          event.preventDefault();
          focusInput();
        }}
      >
        {selectedSlugs.map((slug) => {
          const option = optionBySlug.get(slug);
          const label = option?.label ?? slug.replace(/_/g, " ");
          return (
            <span
              key={`vocab-${slug}`}
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-[var(--color-primary)]/10 py-0.5 pl-2.5 pr-1 text-xs font-medium text-[var(--color-primary)]"
            >
              <span className="truncate">{label}</span>
              <button
                type="button"
                data-chip-remove
                disabled={disabled}
                onClick={() => removeSlug(slug)}
                className="inline-flex size-5 shrink-0 items-center justify-center rounded-full hover:bg-[var(--color-primary)]/15 disabled:cursor-not-allowed"
                aria-label={`Remove ${label}`}
              >
                <span aria-hidden>×</span>
              </button>
            </span>
          );
        })}

        {suggestedLabels.map((label) => (
          <span
            key={`suggest-${label.toLowerCase()}`}
            className="inline-flex max-w-full items-center gap-1 rounded-full border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] py-0.5 pl-2.5 pr-1 text-xs font-medium text-[var(--color-text-secondary)]"
            title="Suggested — reviewed before going live"
          >
            <span className="truncate">{label}</span>
            <span className="sr-only">(suggested)</span>
            <button
              type="button"
              data-chip-remove
              disabled={disabled}
              onClick={() => removeSuggested(label)}
              className="inline-flex size-5 shrink-0 items-center justify-center rounded-full hover:bg-[var(--color-border)]/40 disabled:cursor-not-allowed"
              aria-label={`Remove suggested tag ${label}`}
            >
              <span aria-hidden>×</span>
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={query}
          disabled={inputDisabled}
          placeholder={
            loading
              ? "Loading…"
              : atMax
                ? "Limit reached"
                : !hasChips
                  ? placeholder
                  : "Add another…"
          }
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlightIndex(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => {
              if (!containerRef.current?.contains(document.activeElement)) {
                setOpen(false);
              }
            }, 0);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              return;
            }

            if (event.key === "ArrowDown" && filteredOptions.length > 0) {
              event.preventDefault();
              setOpen(true);
              setHighlightIndex((index) => (index + 1) % filteredOptions.length);
              return;
            }

            if (event.key === "ArrowUp" && filteredOptions.length > 0) {
              event.preventDefault();
              setOpen(true);
              setHighlightIndex(
                (index) => (index - 1 + filteredOptions.length) % filteredOptions.length,
              );
              return;
            }

            if (event.key === "Enter") {
              event.preventDefault();
              const option = filteredOptions[highlightIndex];
              if (option) {
                addSlug(option.slug);
                return;
              }
              if (filteredOptions.length === 0 && canSuggest) {
                addSuggested();
              }
              return;
            }

            if (event.key === "Backspace" && !query) {
              if (suggestedLabels.length > 0 && onSuggestedChange) {
                onSuggestedChange(suggestedLabels.slice(0, -1));
              } else if (selectedSlugs.length > 0) {
                onChange(selectedSlugs.slice(0, -1));
              }
            }
          }}
          className="min-w-[6rem] flex-1 border-0 bg-transparent px-1 py-1 text-base outline-none placeholder:text-[var(--color-text-tertiary)]"
          role="combobox"
          aria-expanded={showSuggestions}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-haspopup="listbox"
        />

        {loading ? (
          <span
            className="inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)]"
            aria-hidden
          />
        ) : null}
      </div>

      {showSuggestions ? (
        filteredOptions.length > 0 ? (
          <ul
            id={listboxId}
            role="listbox"
            className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-[var(--color-border)] bg-white py-1 shadow-lg"
          >
            {filteredOptions.map((option, index) => (
              <li
                key={option.slug}
                role="option"
                aria-selected={index === highlightIndex}
              >
                <button
                  type="button"
                  className={cn(
                    "flex w-full px-3 py-2 text-left text-sm",
                    index === highlightIndex
                      ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                      : "hover:bg-[var(--color-surface-muted)]",
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setHighlightIndex(index)}
                  onClick={() => addSlug(option.slug)}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        ) : suggestEnabled ? (
          <div className="absolute z-20 mt-1 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm shadow-lg">
            <p className="text-[var(--color-text-tertiary)]">{emptyMessage}</p>
            {canSuggest ? (
              <button
                type="button"
                className="mt-1.5 text-left font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
                onMouseDown={(event) => event.preventDefault()}
                onClick={addSuggested}
              >
                {emptyActionLabel}
              </button>
            ) : suggestAlreadyAdded ? (
              <p className="mt-1.5 text-[var(--color-text-tertiary)]">
                Already suggested
              </p>
            ) : null}
          </div>
        ) : (
          <p className="absolute z-20 mt-1 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text-tertiary)] shadow-lg">
            {emptyMessage}
          </p>
        )
      ) : null}
    </div>
  );
}
