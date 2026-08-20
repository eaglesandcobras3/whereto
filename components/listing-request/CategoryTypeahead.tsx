"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { FREE_ONBOARD_SUGGESTED_CATEGORY_MAX } from "@/lib/listing-requests/free-onboard-schema";

export type CategoryTypeaheadOption = {
  id: string;
  title: string;
  /** Parent/group label shown as secondary text and used in search. */
  groupTitle?: string | null;
};

type Props = {
  id?: string;
  options: CategoryTypeaheadOption[];
  value: string;
  onChange: (categoryId: string) => void;
  /** Free-text suggested category (mutually exclusive with `value`). */
  suggestedValue?: string;
  onSuggestedChange?: (label: string) => void;
  /**
   * Label used when `value` is set but not yet present in `options`
   * (e.g. verify/update prefill before options load, or unpublished leaf).
   */
  fallbackLabel?: string | null;
  fallbackGroupTitle?: string | null;
  disabled?: boolean;
  placeholder?: string;
  inputClassName: string;
  emptyMessage?: string;
};

function optionLabel(option: CategoryTypeaheadOption): string {
  return option.groupTitle ? `${option.groupTitle} — ${option.title}` : option.title;
}

function normalizeSuggested(raw: string): string {
  return raw.trim().slice(0, FREE_ONBOARD_SUGGESTED_CATEGORY_MAX);
}

/**
 * Single-select category combobox with in-list “Suggest …” (same pattern as search tags).
 */
export function CategoryTypeahead({
  id,
  options,
  value,
  onChange,
  suggestedValue = "",
  onSuggestedChange,
  fallbackLabel = null,
  fallbackGroupTitle = null,
  disabled = false,
  placeholder = "Search categories…",
  inputClassName,
  emptyMessage = "No matching categories",
}: Props) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const selected = useMemo(() => {
    const fromOptions = options.find((o) => o.id === value) ?? null;
    if (fromOptions) return fromOptions;
    if (!value) return null;
    const label = fallbackLabel?.trim();
    if (label) {
      return {
        id: value,
        title: label,
        groupTitle: fallbackGroupTitle?.trim() || null,
      };
    }
    return null;
  }, [options, value, fallbackLabel, fallbackGroupTitle]);
  const suggested = suggestedValue.trim();
  const hasSelection = Boolean(selected) || suggested.length > 0;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options.slice(0, 40);
    return options
      .filter((o) => {
        const hay = `${o.title} ${o.groupTitle ?? ""}`.toLowerCase();
        return hay.includes(needle);
      })
      .slice(0, 40);
  }, [options, query]);

  const normalizedSuggest = normalizeSuggested(query);
  const exactMatch = options.some(
    (o) => o.title.toLowerCase() === normalizedSuggest.toLowerCase(),
  );
  const canSuggest =
    Boolean(onSuggestedChange) &&
    normalizedSuggest.length > 0 &&
    !exactMatch &&
    normalizedSuggest.toLowerCase() !== suggested.toLowerCase();

  const optionCount = filtered.length + (canSuggest ? 1 : 0);

  function updateQuery(next: string) {
    setQuery(next);
    setActiveIndex(0);
  }

  /** Open search without clearing — cancel restores the category that was selected. */
  function startChange() {
    updateQuery("");
    setOpen(true);
    setActiveIndex(0);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function cancelChange() {
    setOpen(false);
    updateQuery("");
  }

  useEffect(() => {
    if (!open) return;
    function onDocPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        cancelChange();
      }
    }
    document.addEventListener("mousedown", onDocPointer);
    return () => document.removeEventListener("mousedown", onDocPointer);
  }, [open]);

  function selectOption(option: CategoryTypeaheadOption) {
    onChange(option.id);
    onSuggestedChange?.("");
    updateQuery("");
    setOpen(false);
  }

  function selectSuggest() {
    if (!onSuggestedChange || !canSuggest) return;
    onSuggestedChange(normalizedSuggest);
    onChange("");
    updateQuery("");
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
      cancelChange();
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (optionCount === 0) return;
      setActiveIndex((i) => (i + 1) % optionCount);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (optionCount === 0) return;
      setActiveIndex((i) => (i <= 0 ? optionCount - 1 : i - 1));
      return;
    }
    if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      if (activeIndex < filtered.length) {
        selectOption(filtered[activeIndex]);
      } else if (canSuggest) {
        selectSuggest();
      }
    }
  }

  if (hasSelection && !open) {
    return (
      <div
        id={inputId}
        className="mt-1.5 flex items-center gap-2 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2.5"
      >
        <div className="min-w-0 flex-1">
          {selected ? (
            <>
              <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                {selected.title}
              </p>
              {selected.groupTitle ? (
                <p className="truncate text-xs text-[var(--color-text-tertiary)]">
                  {selected.groupTitle}
                </p>
              ) : null}
            </>
          ) : (
            <>
              <span
                className="inline-flex max-w-full items-center gap-1 rounded-full border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] py-0.5 pl-2.5 pr-2 text-xs font-medium text-[var(--color-text-secondary)]"
                title="Suggested — reviewed before going live"
              >
                <span className="truncate">{suggested}</span>
                <span className="sr-only">(suggested)</span>
              </span>
              <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                Suggested — our team reviews new categories before they go live.
              </p>
            </>
          )}
        </div>
        <input type="hidden" name="category_id" value={value} />
        <input type="hidden" name="suggested_category" value={suggested} />
        <button
          type="button"
          disabled={disabled}
          onClick={startChange}
          className="shrink-0 text-sm font-medium text-[var(--color-logo-navy)] underline-offset-2 hover:underline disabled:opacity-50"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative mt-1.5">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          id={inputId}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined
          }
          disabled={disabled}
          value={query}
          autoComplete="off"
          placeholder={placeholder}
          onChange={(e) => {
            updateQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setActiveIndex(0);
          }}
          onKeyDown={onKeyDown}
          className={`${inputClassName} min-w-0 flex-1`}
        />
        {hasSelection ? (
          <button
            type="button"
            disabled={disabled}
            onClick={cancelChange}
            className="shrink-0 text-sm font-medium text-[var(--color-logo-navy)] underline-offset-2 hover:underline disabled:opacity-50"
          >
            Cancel
          </button>
        ) : null}
      </div>
      <input type="hidden" name="category_id" value={value} />
      <input type="hidden" name="suggested_category" value={suggested} />
      {open && !disabled ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] py-1 shadow-lg"
        >
          {filtered.length === 0 && !canSuggest ? (
            <li className="px-3 py-2 text-sm text-[var(--color-text-tertiary)]">{emptyMessage}</li>
          ) : null}
          {filtered.map((option, index) => {
            const active = index === activeIndex;
            return (
              <li
                key={option.id}
                id={`${listId}-opt-${index}`}
                role="option"
                aria-selected={active || option.id === value}
                className={`cursor-pointer px-3 py-2.5 text-sm ${
                  active
                    ? "bg-[var(--color-primary)]/10 text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)]"
                }`}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectOption(option);
                }}
              >
                <span className="font-medium">{option.title}</span>
                {option.groupTitle ? (
                  <span className="mt-0.5 block text-xs text-[var(--color-text-tertiary)]">
                    {option.groupTitle}
                  </span>
                ) : null}
                <span className="sr-only">{optionLabel(option)}</span>
              </li>
            );
          })}
          {canSuggest ? (
            <li
              id={`${listId}-opt-${filtered.length}`}
              role="option"
              aria-selected={activeIndex === filtered.length}
              className={`cursor-pointer border-t border-[var(--color-border)] px-3 py-2.5 text-sm ${
                activeIndex === filtered.length
                  ? "bg-[var(--color-primary)]/10 text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
              }`}
              onMouseEnter={() => setActiveIndex(filtered.length)}
              onMouseDown={(e) => {
                e.preventDefault();
                selectSuggest();
              }}
            >
              Suggest &ldquo;{normalizedSuggest}&rdquo;
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
