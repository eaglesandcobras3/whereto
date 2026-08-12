"use client";

import { type ReactNode } from "react";
import { BusinessPreviewCard } from "@/components/discovery/BusinessPreviewCard";
import { browseGroupIcon } from "@/lib/business-categories/group-browse-sections";
import type { BrowseGroupSection } from "@/lib/business-categories/group-browse-sections";
import type { BusinessCategoryGroupSlug } from "@/lib/business-categories/groups";
import { CollapsibleBrowseSection } from "@/components/ui/collapsible-browse-section";
import { usePersistedExpandedSectionIds } from "@/lib/hooks/use-persisted-expanded-section-ids";

type Props = {
  placeName: string;
  placeSlug: string;
  sections: BrowseGroupSection[];
  analyticsCategoryPrefix: string;
  heading?: string;
  subheading?: string;
  emptyMessage?: ReactNode;
  /** How many categories to show expanded by default (all breakpoints). */
  defaultExpandedCount?: number;
};

export function PlaceCategoryBusinessSections({
  placeName,
  placeSlug,
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
  });

  if (sections.length === 0) {
    return emptyMessage ? <div>{emptyMessage}</div> : null;
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h2 className="font-headline text-xl font-bold text-[var(--color-text-primary)] sm:text-2xl">
          {heading ?? `Local businesses in ${placeName}`}
        </h2>
        <p className="mt-1.5 text-left text-sm leading-relaxed text-[var(--color-text-secondary)] sm:mt-2">
          {subheading ?? "Browse by category. Tap a section to collapse."}
        </p>
      </div>

      {sections.map((section) => {
        const iconSlug = browseGroupIcon(section.slug as BusinessCategoryGroupSlug);
        const isOpen = expandedIds.has(section.id);

        const businessItems = section.businesses.map((business) => ({
          id: business.id,
          name: business.name,
          slug: business.slug,
          excerpt: business.ai_summary,
          heroImageUrl: business.hero_image_url,
        }));

        return (
          <CollapsibleBrowseSection
            key={section.id}
            title={section.title}
            subtitle={`${section.totalCount} ${section.totalCount === 1 ? "listing" : "listings"}`}
            icon={
              <span className="material-symbols-outlined text-xl" aria-hidden>
                {iconSlug}
              </span>
            }
            open={isOpen}
            onToggle={() => toggle(section.id)}
          >
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {businessItems.map((business) => (
                <li key={business.id} className="h-full">
                  <BusinessPreviewCard
                    name={business.name}
                    slug={business.slug}
                    excerpt={business.excerpt}
                    heroImageUrl={business.heroImageUrl}
                    analyticsCategory={`${analyticsCategoryPrefix}_business`}
                    analyticsLabel={`${placeSlug}_${business.slug}`}
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
