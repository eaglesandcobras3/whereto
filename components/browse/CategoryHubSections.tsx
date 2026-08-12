"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { BusinessPreviewCard } from "@/components/discovery/BusinessPreviewCard";
import { browseGroupIcon } from "@/lib/business-categories/group-browse-sections";
import {
  businessBrowseGroupHubPath,
  isBusinessBrowseGroupSlug,
} from "@/lib/business-categories/browse-group-nav";
import {
  isUnifiedRollupSlug,
  unifiedRollupHubPath,
} from "@/lib/categories/unified-browse";
import type { CategoryHubSection } from "@/lib/data/category-hub";
import { CollapsibleBrowseSection } from "@/components/ui/collapsible-browse-section";
import { usePersistedExpandedSectionIds } from "@/lib/hooks/use-persisted-expanded-section-ids";

type Props = {
  sections: CategoryHubSection[];
  analyticsCategoryPrefix: string;
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

export function CategoryHubSections({
  sections,
  analyticsCategoryPrefix,
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
          {subheading ?? "Tap a group to collapse and browse listings."}
        </p>
      </div>

      {sections.map((section) => {
        const iconSlug = browseGroupIcon(section.slug);
        const isOpen = expandedIds.has(section.id);

        return (
          <CollapsibleBrowseSection
            key={section.id}
            sectionId={section.slug}
            title={section.title}
            subtitle={`${section.totalCount} ${section.totalCount === 1 ? "listing" : "listings"}`}
            action={
              <Link
                href={sectionHubPath(section.slug)}
                className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
              >
                View by town
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
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {section.businesses.map((business) => (
                <li key={business.id} className="h-full">
                  <BusinessPreviewCard
                    name={business.name}
                    slug={business.slug}
                    excerpt={business.ai_summary}
                    heroImageUrl={business.hero_image_url}
                    analyticsCategory={`${analyticsCategoryPrefix}_business`}
                    analyticsLabel={business.slug}
                  />
                </li>
              ))}
            </ul>
          </CollapsibleBrowseSection>
        );
      })}
    </div>
  );
}
