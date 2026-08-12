"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { browseGroupIcon } from "@/lib/business-categories/group-browse-sections";
import {
  businessBrowseGroupHubPath,
  isBusinessBrowseGroupSlug,
} from "@/lib/business-categories/browse-group-nav";
import {
  isUnifiedRollupSlug,
  leafCategoryIcon,
  unifiedRollupHubPath,
} from "@/lib/categories/unified-browse";
import { categoryHubPath } from "@/lib/routes/category-hub-path";
import { CollapsibleBrowseSection } from "@/components/ui/collapsible-browse-section";
import { usePersistedExpandedSectionIds } from "@/lib/hooks/use-persisted-expanded-section-ids";

export type CategoryHubLinkLeaf = {
  id: string;
  title: string;
  slug: string;
};

export type CategoryHubLinkSection = {
  id: string;
  title: string;
  slug: string;
  leaves: CategoryHubLinkLeaf[];
};

type Props = {
  sections: CategoryHubLinkSection[];
  heading?: string;
  subheading?: string;
  emptyMessage?: ReactNode;
  defaultExpandedCount?: number;
};

function sectionHubPath(slug: string): string {
  if (isUnifiedRollupSlug(slug)) return unifiedRollupHubPath(slug);
  if (isBusinessBrowseGroupSlug(slug)) return businessBrowseGroupHubPath(slug);
  return `/businesses/${slug.replace(/_/g, "-")}`;
}

function isValidSectionHash(value: string): boolean {
  return isUnifiedRollupSlug(value) || isBusinessBrowseGroupSlug(value);
}

export function CategoryHubLinkSections({
  sections,
  heading,
  subheading,
  emptyMessage,
  defaultExpandedCount,
}: Props) {
  const { expandedIds, toggle } = usePersistedExpandedSectionIds({
    sectionIds: sections.map((section) => section.id),
    defaultExpandedCount: defaultExpandedCount ?? sections.length,
    desktopOnlyDefaults: false,
    isValidHash: isValidSectionHash,
    onHashApplied: (sectionId) => {
      requestAnimationFrame(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
  });

  if (sections.length === 0) {
    return emptyMessage ? <div>{emptyMessage}</div> : null;
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h2 className="font-headline text-xl font-bold text-[var(--color-text-primary)] sm:text-2xl">
          {heading ?? "Browse by category"}
        </h2>
        <p className="mt-1.5 text-left text-sm leading-relaxed text-[var(--color-text-secondary)] sm:mt-2">
          {subheading ?? "Tap a group to see category pages."}
        </p>
      </div>

      {sections.map((section) => {
        const iconSlug = browseGroupIcon(section.slug);
        const isOpen = expandedIds.has(section.id);
        const leafCount = section.leaves.length;

        return (
          <CollapsibleBrowseSection
            key={section.id}
            sectionId={section.slug}
            title={section.title}
            subtitle={`${leafCount} ${leafCount === 1 ? "category" : "categories"}`}
            action={
              <Link
                href={sectionHubPath(section.slug)}
                className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
              >
                View all in group
              </Link>
            }
            icon={
              <span className="material-symbols-outlined text-xl" aria-hidden>
                {iconSlug}
              </span>
            }
            open={isOpen}
            onToggle={() => toggle(section.id)}
          >
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {section.leaves.map((leaf) => (
                <li key={leaf.id}>
                  <Link
                    href={categoryHubPath(leaf.slug)}
                    className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-container-high)] text-[var(--color-primary)]"
                      aria-hidden
                    >
                      <span className="material-symbols-outlined !text-xl">
                        {leafCategoryIcon(leaf.slug)}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">{leaf.title}</span>
                    <span className="material-symbols-outlined !text-lg shrink-0 text-[var(--color-text-tertiary)]" aria-hidden>
                      chevron_right
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CollapsibleBrowseSection>
        );
      })}
    </div>
  );
}
