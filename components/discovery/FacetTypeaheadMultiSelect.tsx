"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { FacetDefinition } from "@/lib/discovery-filters/facet-allowlists";

type Props = {
  options: FacetDefinition[];
  selectedSlugs: string[];
  onChange: (slugs: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function FacetTypeaheadMultiSelect({
  options,
  selectedSlugs,
  onChange,
  disabled,
  placeholder = "Search tags…",
}: Props) {
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const optionBySlug = useMemo(() => {
    const map = new Map<string, FacetDefinition>();
    for (const option of options) {
      map.set(option.slug, option);
    }
    return map;
  }, [options]);

  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return options.filter((option) => {
      if (selectedSlugs.includes(option.slug)) return false;
      if (!needle) return true;
      return (
        option.label.toLowerCase().includes(needle) ||
        option.slug.replace(/_/g, " ").includes(needle)
      );
    });
  }, [options, query, selectedSlugs]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (inputRef.current?.parentElement?.contains(target)) return;
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
  };

  return (
    <div className="space-y-2">
      {selectedSlugs.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedSlugs.map((slug) => {
            const option = optionBySlug.get(slug);
            const label = option?.label ?? slug.replace(/_/g, " ");
            return (
              <button
                key={slug}
                type="button"
                disabled={disabled}
                onClick={() => removeSlug(slug)}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary)]/10 px-2.5 py-1 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/15"
                aria-label={`Remove ${label}`}
              >
                <span>{label}</span>
                <span aria-hidden>×</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="relative">
        <input
          ref={inputRef}
          id="discover-facets"
          type="text"
          value={query}
          disabled={disabled || options.length === 0}
          placeholder={options.length === 0 ? "Select a category first" : placeholder}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              return;
            }
            if (event.key === "Enter" && filteredOptions[0]) {
              event.preventDefault();
              addSlug(filteredOptions[0].slug);
            }
            if (event.key === "Backspace" && !query && selectedSlugs.length > 0) {
              onChange(selectedSlugs.slice(0, -1));
            }
          }}
          className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
        />

        {open && filteredOptions.length > 0 ? (
          <ul
            id={listboxId}
            role="listbox"
            className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-[var(--color-border)] bg-white py-1 shadow-lg"
          >
            {filteredOptions.map((option) => (
              <li key={`${option.family}:${option.slug}`} role="option">
                <button
                  type="button"
                  className={cn(
                    "flex w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-muted)]",
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => addSlug(option.slug)}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
