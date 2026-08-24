"use client";

import { useMemo } from "react";
import { CategoryMultiSelect } from "@/components/categories/CategoryMultiSelect";
import { BUSINESS_CATEGORY_MEMBERSHIP_MAX } from "@/lib/categories/membership-normalize";
import {
  extraMembershipIds,
  mergeMembershipIds,
  suggestedExtraCategories,
  type CategoryLeafOption,
} from "@/lib/categories/suggested-extra-categories";

type Props = {
  primaryCategoryId: string;
  membershipIds: string[];
  onMembershipIdsChange: (ids: string[]) => void;
  leafOptions: CategoryLeafOption[];
  relatedByCategoryId: Record<string, string[]>;
  maxTotal?: number;
  loading?: boolean;
  disabled?: boolean;
  legend?: string;
  helpText?: string;
  /** intake = CSS vars; admin = zinc utility classes */
  tone?: "intake" | "admin";
};

export function AdditionalCategoriesPicker({
  primaryCategoryId,
  membershipIds,
  onMembershipIdsChange,
  leafOptions,
  relatedByCategoryId,
  maxTotal = BUSINESS_CATEGORY_MEMBERSHIP_MAX,
  loading = false,
  disabled = false,
  legend = "Additional categories (optional)",
  helpText,
  tone = "intake",
}: Props) {
  const extraIds = extraMembershipIds(primaryCategoryId, membershipIds);
  const maxExtras = Math.max(0, maxTotal - 1);
  const atCap = membershipIds.length >= maxTotal;

  const pickerOptions = useMemo(
    () => leafOptions.filter((leaf) => leaf.id !== primaryCategoryId),
    [leafOptions, primaryCategoryId],
  );

  const optionById = useMemo(() => {
    const map = new Map(leafOptions.map((leaf) => [leaf.id, leaf]));
    for (const id of extraIds) {
      if (!map.has(id)) map.set(id, { id, title: id });
    }
    return map;
  }, [leafOptions, extraIds]);

  const multiselectOptions = useMemo(() => {
    const byId = new Map(pickerOptions.map((leaf) => [leaf.id, leaf]));
    for (const id of extraIds) {
      if (!byId.has(id)) byId.set(id, optionById.get(id) ?? { id, title: id });
    }
    return Array.from(byId.values()).sort((a, b) => a.title.localeCompare(b.title));
  }, [pickerOptions, extraIds, optionById]);

  const suggested = useMemo(
    () =>
      suggestedExtraCategories(
        primaryCategoryId,
        extraIds,
        relatedByCategoryId,
        leafOptions,
      ),
    [primaryCategoryId, extraIds, relatedByCategoryId, leafOptions],
  );

  function setExtraIds(nextExtras: string[]) {
    onMembershipIdsChange(mergeMembershipIds(primaryCategoryId, nextExtras, maxTotal));
  }

  function toggleSuggested(categoryId: string) {
    if (extraIds.includes(categoryId)) {
      setExtraIds(extraIds.filter((id) => id !== categoryId));
      return;
    }
    if (atCap) return;
    setExtraIds([...extraIds, categoryId]);
  }

  const isAdmin = tone === "admin";
  const fieldsetClass = isAdmin
    ? "space-y-3 rounded-xl border border-zinc-200 p-3"
    : "mt-3 space-y-3 rounded-xl border border-[var(--color-border)] p-3";
  const legendClass = isAdmin
    ? "px-1 text-sm font-medium text-zinc-700"
    : "px-1 text-sm font-medium text-[var(--color-text-primary)]";
  const helpClass = isAdmin
    ? "text-xs text-zinc-500"
    : "text-xs text-[var(--color-text-tertiary)]";
  const suggestLabelClass = isAdmin
    ? "text-xs font-medium text-zinc-600"
    : "text-xs font-medium text-[var(--color-text-secondary)]";
  const chipSelectedClass = isAdmin
    ? "inline-flex items-center gap-1 rounded-full bg-zinc-900/10 py-1 pl-2.5 pr-2 text-xs font-medium text-zinc-900"
    : "inline-flex items-center gap-1 rounded-full bg-[var(--color-primary)]/10 py-1 pl-2.5 pr-2 text-xs font-medium text-[var(--color-primary)]";
  const chipIdleClass = isAdmin
    ? "inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white py-1 pl-2.5 pr-2 text-xs font-medium text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
    : "inline-flex items-center gap-1 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] py-1 pl-2.5 pr-2 text-xs font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50";

  const defaultHelp =
    helpText ??
    `Primary is set above. Add up to ${maxExtras} more if the business clearly fits.`;

  return (
    <fieldset className={fieldsetClass}>
      <legend className={legendClass}>{legend}</legend>
      <p className={helpClass}>{defaultHelp}</p>

      {suggested.length > 0 ? (
        <div>
          <p className={suggestLabelClass}>Suggested for this category</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {suggested.map((leaf) => {
              const selected = extraIds.includes(leaf.id);
              const addDisabled = !selected && atCap;
              const label = leaf.groupTitle ? `${leaf.groupTitle} · ${leaf.title}` : leaf.title;
              return (
                <li key={leaf.id}>
                  <button
                    type="button"
                    disabled={disabled || addDisabled}
                    onClick={() => toggleSuggested(leaf.id)}
                    aria-pressed={selected}
                    title={
                      selected
                        ? `Remove ${label}`
                        : addDisabled
                          ? `Category limit reached (${maxTotal})`
                          : `Add ${label}`
                    }
                    className={selected ? chipSelectedClass : chipIdleClass}
                  >
                    <span>{leaf.title}</span>
                    <span aria-hidden className="text-[0.7rem] leading-none">
                      {selected ? "✓" : "+"}
                    </span>
                    <span className="sr-only">
                      {selected ? "Selected — click to remove" : "Add category"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <CategoryMultiSelect
        options={multiselectOptions}
        selectedIds={extraIds}
        maxSelected={maxExtras}
        loading={loading}
        disabled={disabled}
        onChange={setExtraIds}
        placeholder="Search categories…"
        emptyMessage="No matching categories"
      />

      <p className={helpClass}>
        {membershipIds.length}/{maxTotal} categories used
        {extraIds.length > 0 ? ` (${extraIds.length} additional)` : null}
      </p>
    </fieldset>
  );
}
