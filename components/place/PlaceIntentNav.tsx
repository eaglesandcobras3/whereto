"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  placeIntentNavHref,
  placeIntentNavHrefForLevel,
  placeIntentNavPlaceLabel,
  placeIntentNavTriggerLabel,
  type PlaceIntentNavMode,
  type PlaceIntentNavSelection,
} from "@/lib/nav/place-intent-nav";
import type {
  PlaceIntentNavCategoryOption,
  PlaceIntentNavPlaceOption,
  PlaceIntentNavSubcategoryOption,
} from "@/lib/nav/build-place-intent-nav-options";

export type PlaceIntentNavProps = {
  mode: PlaceIntentNavMode;
  places: PlaceIntentNavPlaceOption[];
  categories: PlaceIntentNavCategoryOption[];
  subcategories: PlaceIntentNavSubcategoryOption[];
  currentPlaceSlug?: string | null;
  currentCategorySlug?: string | null;
  currentSubcategorySlug?: string | null;
  /** When true, positions like DiscoverTownJumpOverlay on a map. */
  overlay?: boolean;
  className?: string;
};

type NavStep = "place" | "category" | "subcategory";

function selectionFromProps(props: PlaceIntentNavProps): PlaceIntentNavSelection {
  return {
    placeSlug: props.currentPlaceSlug ?? null,
    categorySlug: props.currentCategorySlug ?? null,
    subcategorySlug: props.currentSubcategorySlug ?? null,
  };
}

function labelForPlace(
  places: PlaceIntentNavPlaceOption[],
  slug: string | null | undefined,
): string | null {
  if (!slug) return null;
  return places.find((place) => place.slug === slug)?.label ?? slug.replace(/_/g, " ");
}

function labelForCategory(
  categories: PlaceIntentNavCategoryOption[],
  slug: string | null | undefined,
): string | null {
  if (!slug) return null;
  return categories.find((category) => category.slug === slug)?.label ?? slug.replace(/_/g, " ");
}

function labelForSubcategory(
  subcategories: PlaceIntentNavSubcategoryOption[],
  slug: string | null | undefined,
): string | null {
  if (!slug) return null;
  return (
    subcategories.find((subcategory) => subcategory.slug === slug)?.label ??
    slug.replace(/_/g, " ")
  );
}

function initialStep(selection: PlaceIntentNavSelection): NavStep {
  if (!selection.placeSlug) return "place";
  if (!selection.categorySlug) return "category";
  return "subcategory";
}

function matchesQuery(label: string, slug: string, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    label.toLowerCase().includes(needle) ||
    slug.replace(/_/g, " ").toLowerCase().includes(needle)
  );
}

/**
 * Breadcrumb place → category → subcategory picker for town/area pages.
 * Draft selections update in-panel; Search navigates. Back/clear on crumbs jumps immediately.
 */
export function PlaceIntentNav({
  mode,
  places,
  categories,
  subcategories,
  currentPlaceSlug = null,
  currentCategorySlug = null,
  currentSubcategorySlug = null,
  overlay = false,
  className = "",
}: PlaceIntentNavProps) {
  const router = useRouter();
  const panelId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const committed = useMemo(
    () => selectionFromProps({
      mode,
      places,
      categories,
      subcategories,
      currentPlaceSlug,
      currentCategorySlug,
      currentSubcategorySlug,
    }),
    [
      mode,
      places,
      categories,
      subcategories,
      currentPlaceSlug,
      currentCategorySlug,
      currentSubcategorySlug,
    ],
  );

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<NavStep>(() => initialStep(committed));
  const [draft, setDraft] = useState<PlaceIntentNavSelection>(committed);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setDraft(committed);
      setStep(initialStep(committed));
      setQuery("");
      setHighlightIndex(0);
    }
  }, [committed, open]);

  const placeLabel = placeIntentNavPlaceLabel(mode);
  const triggerLabel = placeIntentNavTriggerLabel(mode);

  const committedPlaceLabel = labelForPlace(places, committed.placeSlug);
  const committedCategoryLabel = labelForCategory(categories, committed.categorySlug);
  const committedSubcategoryLabel = labelForSubcategory(
    subcategories,
    committed.subcategorySlug,
  );

  const draftPlaceLabel = labelForPlace(places, draft.placeSlug);
  const draftCategoryLabel = labelForCategory(categories, draft.categorySlug);
  const draftSubcategoryLabel = labelForSubcategory(subcategories, draft.subcategorySlug);

  const categoryOptions = useMemo(() => {
    if (!draft.placeSlug) return [];
    return categories;
  }, [categories, draft.placeSlug]);

  const subcategoryOptions = useMemo(() => {
    if (!draft.placeSlug || !draft.categorySlug) return [];
    return subcategories.filter((item) => item.rollupSlug === draft.categorySlug);
  }, [draft.categorySlug, draft.placeSlug, subcategories]);

  const listItems = useMemo(() => {
    if (step === "place") {
      return places
        .filter((place) => matchesQuery(place.label, place.slug, query))
        .slice(0, 12)
        .map((place) => ({
          key: place.slug,
          slug: place.slug,
          label: place.label,
          icon: "location_on",
          active: place.slug === draft.placeSlug,
        }));
    }
    if (step === "category") {
      return categoryOptions
        .filter((category) => matchesQuery(category.label, category.slug, query))
        .slice(0, 12)
        .map((category) => ({
          key: category.slug,
          slug: category.slug,
          label: category.label,
          icon: category.icon,
          active: category.slug === draft.categorySlug,
        }));
    }
    return subcategoryOptions
      .filter((subcategory) => matchesQuery(subcategory.label, subcategory.slug, query))
      .slice(0, 12)
      .map((subcategory) => ({
        key: subcategory.slug,
        slug: subcategory.slug,
        label: subcategory.label,
        icon: "category",
        active: subcategory.slug === draft.subcategorySlug,
      }));
  }, [
    categoryOptions,
    draft.categorySlug,
    draft.placeSlug,
    draft.subcategorySlug,
    places,
    query,
    step,
    subcategoryOptions,
  ]);

  const searchHref = placeIntentNavHref(mode, draft);
  const canSearch = Boolean(draft.placeSlug) && Boolean(searchHref);

  const openPanel = () => {
    setDraft(committed);
    setStep(initialStep(committed));
    setQuery("");
    setHighlightIndex(0);
    setOpen(true);
    window.setTimeout(() => inputRef.current?.focus(), 20);
  };

  const close = () => setOpen(false);

  const navigateTo = (href: string) => {
    close();
    router.push(href);
  };

  const pick = (slug: string) => {
    if (step === "place") {
      setDraft({
        placeSlug: slug,
        categorySlug: null,
        subcategorySlug: null,
      });
      setStep("category");
      setQuery("");
      setHighlightIndex(0);
      window.setTimeout(() => inputRef.current?.focus(), 20);
      return;
    }
    if (step === "category") {
      setDraft((current) => ({
        ...current,
        categorySlug: slug,
        subcategorySlug: null,
      }));
      setStep("subcategory");
      setQuery("");
      setHighlightIndex(0);
      window.setTimeout(() => inputRef.current?.focus(), 20);
      return;
    }
    setDraft((current) => ({
      ...current,
      subcategorySlug: slug,
    }));
  };

  const goBack = () => {
    if (step === "subcategory") {
      setDraft((current) => ({ ...current, subcategorySlug: null }));
      setStep("category");
    } else if (step === "category") {
      setDraft((current) => ({
        ...current,
        categorySlug: null,
        subcategorySlug: null,
      }));
      setStep("place");
    }
    setQuery("");
    setHighlightIndex(0);
    window.setTimeout(() => inputRef.current?.focus(), 20);
  };

  const jumpToLevel = (level: "hub" | "place" | "category" | "subcategory") => {
    const href = placeIntentNavHrefForLevel(mode, committed, level);
    navigateTo(href);
  };

  const stepTitle =
    step === "place"
      ? `Choose ${placeLabel.toLowerCase()}`
      : step === "category"
        ? "Choose category"
        : "Choose subcategory";

  const searchPlaceholder =
    step === "place"
      ? `Search ${placeLabel.toLowerCase()}s…`
      : step === "category"
        ? "Search categories…"
        : "Search subcategories…";

  const rootClass = overlay
    ? `pointer-events-none absolute left-3 top-3 z-[510] flex max-w-[min(100%-1.5rem,20rem)] flex-col items-start gap-2 ${className}`
    : `flex flex-col items-start gap-2 ${className}`;

  const breadcrumbChipClass =
    "inline-flex max-w-full items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/95 py-1 pl-2.5 pr-1 text-xs font-medium text-[var(--color-text-secondary)] shadow-md backdrop-blur-md";

  const renderBreadcrumb = (useDraft: boolean) => {
    const place = useDraft ? draftPlaceLabel : committedPlaceLabel;
    const category = useDraft ? draftCategoryLabel : committedCategoryLabel;
    const subcategory = useDraft ? draftSubcategoryLabel : committedSubcategoryLabel;
    const selection = useDraft ? draft : committed;

    if (!place && !category && !subcategory) return null;

    return (
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--color-text-tertiary)]">
        {place ? (
          <>
            <button
              type="button"
              onClick={() =>
                useDraft
                  ? setStep("place")
                  : jumpToLevel(selection.categorySlug || selection.subcategorySlug ? "place" : "hub")
              }
              className="truncate font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              {place}
            </button>
            {(category || subcategory) && <span aria-hidden>›</span>}
          </>
        ) : null}
        {category ? (
          <>
            <button
              type="button"
              onClick={() =>
                useDraft
                  ? setStep("category")
                  : jumpToLevel(selection.subcategorySlug ? "category" : "place")
              }
              className="truncate font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              {category}
            </button>
            {subcategory ? <span aria-hidden>›</span> : null}
          </>
        ) : null}
        {subcategory ? (
          <span className="truncate font-medium text-[var(--color-text-primary)]">
            {subcategory}
          </span>
        ) : null}
      </div>
    );
  };

  return (
    <div className={rootClass}>
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={triggerLabel}
          className={`pointer-events-auto w-[min(100vw-1.5rem,20rem)] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 shadow-lg backdrop-blur-md ${overlay ? "" : "w-full max-w-md"}`}
        >
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3 py-2">
            {step !== "place" ? (
              <button
                type="button"
                onClick={goBack}
                className="rounded-md p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
                aria-label="Back"
              >
                <span className="material-symbols-outlined !text-lg" aria-hidden>
                  arrow_back
                </span>
              </button>
            ) : (
              <span
                className="material-symbols-outlined text-[var(--color-primary)] !text-lg"
                aria-hidden
              >
                travel_explore
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">{stepTitle}</p>
              <div className="mt-0.5">{renderBreadcrumb(true)}</div>
            </div>
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
              {searchPlaceholder}
            </label>
            <input
              ref={inputRef}
              id={`${panelId}-input`}
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlightIndex(0);
              }}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none ring-[var(--color-primary)] focus:ring-2"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  close();
                  return;
                }
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlightIndex((index) =>
                    Math.min(index + 1, Math.max(listItems.length - 1, 0)),
                  );
                  return;
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlightIndex((index) => Math.max(index - 1, 0));
                  return;
                }
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (listItems[highlightIndex]) {
                    pick(listItems[highlightIndex].slug);
                  }
                }
              }}
            />
          </div>

          <ul className="max-h-56 overflow-y-auto pb-2" role="listbox">
            {listItems.length === 0 ? (
              <li className="px-3 py-2 text-sm text-[var(--color-text-tertiary)]">
                {step === "category" && !draft.placeSlug
                  ? `Choose a ${placeLabel.toLowerCase()} first`
                  : step === "subcategory" && !draft.categorySlug
                    ? "Choose a category first"
                    : "No matches"}
              </li>
            ) : (
              listItems.map((item, index) => {
                const highlighted = index === highlightIndex;
                return (
                  <li key={item.key} role="option" aria-selected={item.active}>
                    <button
                      type="button"
                      onMouseEnter={() => setHighlightIndex(index)}
                      onClick={() => pick(item.slug)}
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
                        {item.icon}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
                      {item.active ? (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                          Selected
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          <div className="border-t border-[var(--color-border)] p-2">
            <button
              type="button"
              disabled={!canSearch}
              onClick={() => {
                if (!searchHref) return;
                navigateTo(searchHref);
              }}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="material-symbols-outlined !text-base" aria-hidden>
                search
              </span>
              Search
            </button>
          </div>
        </div>
      ) : (
        <div className={`${overlay ? "pointer-events-auto" : ""} flex flex-wrap items-center gap-2`}>
          <button
            type="button"
            onClick={openPanel}
            aria-expanded={false}
            aria-controls={panelId}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/95 px-3 py-1.5 text-sm font-semibold text-[var(--color-text-primary)] shadow-md backdrop-blur-md hover:border-[var(--color-primary)]/40"
          >
            <span
              className="material-symbols-outlined !text-base text-[var(--color-primary)]"
              aria-hidden
            >
              travel_explore
            </span>
            {triggerLabel}
          </button>

          {committedPlaceLabel ? (
            <span className={breadcrumbChipClass}>
              <button
                type="button"
                onClick={() => jumpToLevel("place")}
                className="truncate hover:text-[var(--color-text-primary)]"
              >
                {committedPlaceLabel}
              </button>
              <button
                type="button"
                onClick={() =>
                  jumpToLevel(
                    committed.categorySlug || committed.subcategorySlug ? "hub" : "hub",
                  )
                }
                className="rounded-full p-0.5 hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
                aria-label={`Clear ${committedPlaceLabel}`}
              >
                <span className="material-symbols-outlined !text-sm" aria-hidden>
                  close
                </span>
              </button>
            </span>
          ) : null}

          {committedCategoryLabel ? (
            <span className={breadcrumbChipClass}>
              <button
                type="button"
                onClick={() => jumpToLevel("category")}
                className="truncate hover:text-[var(--color-text-primary)]"
              >
                {committedCategoryLabel}
              </button>
              <button
                type="button"
                onClick={() => jumpToLevel("place")}
                className="rounded-full p-0.5 hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
                aria-label={`Clear ${committedCategoryLabel}`}
              >
                <span className="material-symbols-outlined !text-sm" aria-hidden>
                  close
                </span>
              </button>
            </span>
          ) : null}

          {committedSubcategoryLabel ? (
            <span className={breadcrumbChipClass}>
              <span className="truncate">{committedSubcategoryLabel}</span>
              <button
                type="button"
                onClick={() => jumpToLevel("category")}
                className="rounded-full p-0.5 hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
                aria-label={`Clear ${committedSubcategoryLabel}`}
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
