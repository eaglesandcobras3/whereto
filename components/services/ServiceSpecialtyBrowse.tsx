"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SERVICE_CATEGORY_ICONS } from "@/lib/service-categories/constants";
import type {
  ServiceSpecialtyBrowseGroup,
} from "@/lib/service-categories/service-specialty-browse";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import { serviceVendorsHubHref } from "@/lib/routes/service-vendors-hub";

export type { ServiceSpecialtyBrowseGroup, ServiceSpecialtyChip } from "@/lib/service-categories/service-specialty-browse";

type Props = {
  groups: ServiceSpecialtyBrowseGroup[];
  /** Group to expand by default (contains active specialty). */
  defaultOpenGroupSlug: string | null;
  allHref: string;
  allActive: boolean;
  query: string;
  specialtyHeading: string;
  hubBrowseSubheading: string;
};

export function ServiceSpecialtyBrowse({
  groups,
  defaultOpenGroupSlug,
  allHref,
  allActive,
  query,
  specialtyHeading,
  hubBrowseSubheading,
}: Props) {
  const [filter, setFilter] = useState("");
  const normalizedFilter = filter.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!normalizedFilter) return groups;
    return groups
      .map((g) => ({
        ...g,
        chips: g.chips.filter((c) => c.title.toLowerCase().includes(normalizedFilter)),
      }))
      .filter((g) => g.chips.length > 0);
  }, [groups, normalizedFilter]);

  const totalChips = groups.reduce((n, g) => n + g.chips.length, 0);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-headline text-2xl font-bold text-[var(--color-text-primary)]">
            {specialtyHeading}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-secondary)]">
            {hubBrowseSubheading}
          </p>
        </div>
        {totalChips > 12 ? (
          <div className="relative w-full sm:max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-2.5 !text-[1.1rem] text-[var(--color-text-tertiary)]">
              filter_list
            </span>
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter specialties…"
              aria-label="Filter specialties"
              className="w-full rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-9 pr-4 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary)] focus:outline-none"
            />
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        <Link
          href={allHref}
          className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            allActive
              ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
              : "border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]"
          }`}
        >
          All specialties
        </Link>
      </div>

      <div className="mt-5 space-y-2">
        {filteredGroups.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">
            No specialties match &ldquo;{filter}&rdquo;.
          </p>
        ) : (
          filteredGroups.map((group) => {
            const open = defaultOpenGroupSlug === group.groupSlug || Boolean(normalizedFilter);
            return (
              <details
                key={group.groupSlug}
                open={open}
                className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="font-headline text-base font-semibold text-[var(--color-text-primary)]">
                    {group.groupLabel}
                  </span>
                  <span className="flex items-center gap-2 text-sm text-[var(--color-text-tertiary)]">
                    <span>
                      {group.chips.length}{" "}
                      {group.chips.length === 1 ? "specialty" : "specialties"} · {group.totalVendors}{" "}
                      {group.totalVendors === 1 ? "provider" : "providers"}
                    </span>
                    <span className="material-symbols-outlined !text-xl transition-transform group-open:rotate-180">
                      expand_more
                    </span>
                  </span>
                </summary>
                <div className="flex flex-wrap gap-2 border-t border-[var(--color-border)] px-4 py-3">
                  {group.chips.map((chip) => {
                    const icon = SERVICE_CATEGORY_ICONS[chip.slug] ?? "home_repair_service";
                    return (
                      <Link
                        key={chip.slug}
                        href={serviceVendorsHubHref({
                          specialtySlug: chip.slug,
                          query: query || null,
                        })}
                        {...gaClickProps({
                          event: "nav_click",
                          category: "services_hub_specialty",
                          label: chip.slug,
                        })}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                          chip.active
                            ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                            : "border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]"
                        }`}
                      >
                        <span className="material-symbols-outlined !text-base">{icon}</span>
                        {chip.title}
                        <span
                          className={
                            chip.active ? "opacity-80" : "text-[var(--color-text-tertiary)]"
                          }
                        >
                          ({chip.vendorCount})
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </details>
            );
          })
        )}
      </div>
    </div>
  );
}
