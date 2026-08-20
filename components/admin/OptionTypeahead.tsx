"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export type OptionTypeaheadItem = {
  id: string;
  title: string;
  /** Optional secondary line / search haystack. */
  subtitle?: string | null;
};

type Props = {
  id?: string;
  label: string;
  options: OptionTypeaheadItem[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  placeholder?: string;
  allowClear?: boolean;
  emptyMessage?: string;
  inputClassName: string;
  labelClassName: string;
};

/**
 * Simple single-select typeahead (town / area). Clearable when allowClear.
 */
export function OptionTypeahead({
  id,
  label,
  options,
  value,
  onChange,
  disabled = false,
  placeholder = "Search…",
  allowClear = true,
  emptyMessage = "No matches",
  inputClassName,
  labelClassName,
}: Props) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const selected = useMemo(
    () => options.find((o) => o.id === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options.slice(0, 40);
    return options
      .filter((o) => {
        const hay = `${o.title} ${o.subtitle ?? ""}`.toLowerCase();
        return hay.includes(needle);
      })
      .slice(0, 40);
  }, [options, query]);

  const safeActiveIndex = Math.min(activeIndex, Math.max(filtered.length - 1, 0));

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function selectOption(option: OptionTypeaheadItem) {
    onChange(option.id);
    setQuery("");
    setOpen(false);
    setActiveIndex(0);
  }

  function clear() {
    onChange("");
    setQuery("");
    setOpen(false);
    setActiveIndex(0);
  }

  return (
    <div ref={rootRef} className="relative">
      <label className={labelClassName} htmlFor={inputId}>
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={inputId}
          type="text"
          disabled={disabled}
          className={inputClassName}
          placeholder={selected ? selected.title : placeholder}
          value={open ? query : selected?.title ?? query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
            setOpen(true);
            if (value) onChange("");
          }}
          onFocus={() => {
            setOpen(true);
            setQuery("");
            setActiveIndex(0);
          }}
          onKeyDown={(e) => {
            if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
              setOpen(true);
              setActiveIndex(0);
              return;
            }
            if (e.key === "Escape") {
              setOpen(false);
              return;
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIndex((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && open && filtered[safeActiveIndex]) {
              e.preventDefault();
              selectOption(filtered[safeActiveIndex]);
            } else if (e.key === "Backspace" && !query && value && allowClear) {
              clear();
            }
          }}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
        />
        {allowClear && value ? (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-800"
            onClick={clear}
          >
            Clear
          </button>
        ) : null}
      </div>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-zinc-500">{emptyMessage}</li>
          ) : (
            filtered.map((option, index) => (
              <li key={option.id} role="option" aria-selected={index === safeActiveIndex}>
                <button
                  type="button"
                  className={`flex w-full flex-col px-3 py-2 text-left text-sm ${
                    index === safeActiveIndex ? "bg-zinc-100" : "hover:bg-zinc-50"
                  }`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectOption(option)}
                >
                  <span className="font-medium text-zinc-900">{option.title}</span>
                  {option.subtitle ? (
                    <span className="text-xs text-zinc-500">{option.subtitle}</span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
