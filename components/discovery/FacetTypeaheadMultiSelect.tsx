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
  placeholder?: string;
  emptyMessage?: string;
};

export function FacetTypeaheadMultiSelect({
  id,
  options,
  selectedSlugs,
  onChange,
  disabled,
  placeholder = "Search tags…",
  emptyMessage = "No matches",
}: Props) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const optionBySlug = useMemo(() => {
    const map = new Map<string, DiscoverSearchTagOption>();
    for (const option of options) {
      map.set(option.slug, option);
    }
    return map;
  }, [options]);

  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return options.filter((option) => {
      if (selectedSlugs.includes(option.slug)) return false;
      return (
        option.label.toLowerCase().includes(needle) ||
        option.slug.replace(/_/g, " ").includes(needle)
      );
    });
  }, [options, query, selectedSlugs]);

  const showSuggestions = open && query.trim().length > 0;
  const inputDisabled = disabled || options.length === 0;

  useEffect(() => {
    setHighlightIndex(0);
  }, [query, filteredOptions.length]);

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
    if (selectedSlugs.includes(slug)) return;
    onChange([...selectedSlugs, slug]);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  };

  const removeSlug = (slug: string) => {
    onChange(selectedSlugs.filter((s) => s !== slug));
    inputRef.current?.focus();
  };

  const focusInput = () => {
    if (inputDisabled) return;
    inputRef.current?.focus();
    setOpen(true);
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          "flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-white px-2 py-1.5",
          inputDisabled ? "cursor-not-allowed opacity-60" : "cursor-text",
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
              key={slug}
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

        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={query}
          disabled={inputDisabled}
          placeholder={selectedSlugs.length === 0 ? placeholder : "Add another…"}
          onChange={(event) => {
            setQuery(event.target.value);
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
              const option = filteredOptions[highlightIndex];
              if (option) {
                event.preventDefault();
                addSlug(option.slug);
              }
              return;
            }

            if (event.key === "Backspace" && !query && selectedSlugs.length > 0) {
              onChange(selectedSlugs.slice(0, -1));
            }
          }}
          className="min-w-[6rem] flex-1 border-0 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-[var(--color-text-tertiary)]"
          role="combobox"
          aria-expanded={showSuggestions}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-haspopup="listbox"
        />
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
        ) : (
          <p className="absolute z-20 mt-1 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text-tertiary)] shadow-lg">
            {emptyMessage}
          </p>
        )
      ) : null}
    </div>
  );
}
