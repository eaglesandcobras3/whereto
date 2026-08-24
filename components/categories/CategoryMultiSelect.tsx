"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { CategoryLeafOption } from "@/lib/categories/suggested-extra-categories";

type Props = {
  id?: string;
  options: CategoryLeafOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  maxSelected?: number;
  loading?: boolean;
  placeholder?: string;
  emptyMessage?: string;
};

function optionLabel(option: CategoryLeafOption): string {
  return option.groupTitle ? `${option.groupTitle} — ${option.title}` : option.title;
}

/** Multiselect typeahead for leaf category UUIDs (additional categories). */
export function CategoryMultiSelect({
  id,
  options,
  selectedIds,
  onChange,
  disabled,
  maxSelected,
  loading,
  placeholder = "Search categories…",
  emptyMessage = "No matching categories",
}: Props) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const atMax =
    typeof maxSelected === "number" && maxSelected >= 0 && selectedIds.length >= maxSelected;

  const optionById = useMemo(() => {
    const map = new Map<string, CategoryLeafOption>();
    for (const option of options) map.set(option.id, option);
    return map;
  }, [options]);

  const filteredOptions = useMemo(() => {
    if (atMax) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return options.filter((option) => {
      if (selectedIds.includes(option.id)) return false;
      const hay = `${option.title} ${option.groupTitle ?? ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [atMax, options, query, selectedIds]);

  const showSuggestions = open && query.trim().length > 0 && !atMax;
  const hasChips = selectedIds.length > 0;
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

  const addId = (categoryId: string) => {
    if (atMax || selectedIds.includes(categoryId)) return;
    onChange([...selectedIds, categoryId]);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  };

  const removeId = (categoryId: string) => {
    onChange(selectedIds.filter((id) => id !== categoryId));
    inputRef.current?.focus();
  };

  const focusInput = () => {
    if (inputDisabled) return;
    inputRef.current?.focus();
    setOpen(true);
  };

  return (
    <div ref={containerRef} className="relative" aria-busy={loading || undefined}>
      <div
        className={cn(
          "flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-[var(--color-border,#d4d4d8)] bg-white px-2 py-1.5",
          disabled || loading || options.length === 0
            ? hasChips
              ? "cursor-not-allowed"
              : "cursor-not-allowed opacity-60"
            : atMax
              ? "cursor-default"
              : "cursor-text",
          open && !inputDisabled ? "ring-2 ring-[var(--color-primary,#0d9488)]/20" : "",
        )}
        onMouseDown={(event) => {
          if (inputDisabled) return;
          if ((event.target as HTMLElement).closest("[data-chip-remove]")) return;
          event.preventDefault();
          focusInput();
        }}
      >
        {selectedIds.map((categoryId) => {
          const option = optionById.get(categoryId);
          const label = option?.title ?? categoryId;
          const group = option?.groupTitle;
          return (
            <span
              key={categoryId}
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-[var(--color-primary,#0d9488)]/10 py-0.5 pl-2.5 pr-1 text-xs font-medium text-[var(--color-primary,#0d9488)]"
              title={option ? optionLabel(option) : undefined}
            >
              <span className="truncate">
                {group ? `${group} · ${label}` : label}
              </span>
              <button
                type="button"
                data-chip-remove
                disabled={disabled}
                onClick={() => removeId(categoryId)}
                className="inline-flex size-5 shrink-0 items-center justify-center rounded-full hover:bg-[var(--color-primary,#0d9488)]/15 disabled:cursor-not-allowed"
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
              if (option) addId(option.id);
              return;
            }
            if (event.key === "Backspace" && !query && selectedIds.length > 0) {
              onChange(selectedIds.slice(0, -1));
            }
          }}
          className="min-w-[6rem] flex-1 border-0 bg-transparent px-1 py-1 text-base outline-none placeholder:text-[var(--color-text-tertiary,#71717a)]"
          role="combobox"
          aria-expanded={showSuggestions}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-haspopup="listbox"
        />

        {loading ? (
          <span
            className="inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-[var(--color-primary,#0d9488)]/30 border-t-[var(--color-primary,#0d9488)]"
            aria-hidden
          />
        ) : null}
      </div>

      {showSuggestions ? (
        filteredOptions.length > 0 ? (
          <ul
            id={listboxId}
            role="listbox"
            className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-[var(--color-border,#d4d4d8)] bg-white py-1 shadow-lg"
          >
            {filteredOptions.map((option, index) => (
              <li key={option.id} role="option" aria-selected={index === highlightIndex}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full flex-col px-3 py-2 text-left text-sm",
                    index === highlightIndex
                      ? "bg-[var(--color-primary,#0d9488)]/10 text-[var(--color-primary,#0d9488)]"
                      : "hover:bg-[var(--color-surface-muted,#f4f4f5)]",
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setHighlightIndex(index)}
                  onClick={() => addId(option.id)}
                >
                  <span className="font-medium">{option.title}</span>
                  {option.groupTitle ? (
                    <span className="text-xs opacity-80">{option.groupTitle}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="absolute z-20 mt-1 w-full rounded-lg border border-[var(--color-border,#d4d4d8)] bg-white px-3 py-2 text-sm text-[var(--color-text-tertiary,#71717a)] shadow-lg">
            {emptyMessage}
          </p>
        )
      ) : null}
    </div>
  );
}
