"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { BusinessPreviewCard } from "@/components/discovery/BusinessPreviewCard";
import { ListingFieldFlagNote } from "@/components/business/ListingFieldFlagNote";
import { browseGroupIcon } from "@/lib/business-categories/group-browse-sections";
import type { BrowseGroupSection } from "@/lib/business-categories/group-browse-sections";
import type { BusinessCategoryGroupSlug } from "@/lib/business-categories/groups";
import {
  businessBrowseGroupHubPath,
  isBusinessBrowseGroupSlug,
} from "@/lib/business-categories/browse-group-nav";
import {
  isUnifiedRollupSlug,
  unifiedRollupHubPath,
} from "@/lib/categories/unified-browse";
import { CollapsibleBrowseSection } from "@/components/ui/collapsible-browse-section";
import { usePersistedExpandedSectionIds } from "@/lib/hooks/use-persisted-expanded-section-ids";
import { ADD_BUSINESS_HREF } from "@/lib/listing-requests/listing-field-flag";
import { gaClickProps } from "@/lib/analytics/ga-click-props";

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
  flagEntity?: "town" | "area";
  flagEntityId?: string;
};

function sectionHubPath(slug: string): string {
  if (isUnifiedRollupSlug(slug)) return unifiedRollupHubPath(slug);
  if (isBusinessBrowseGroupSlug(slug)) return businessBrowseGroupHubPath(slug);
  return `/businesses/${slug.replace(/_/g, "-")}`;
}

export function PlaceCategoryBusinessSections({
  placeName,
  placeSlug,
  sections,
  analyticsCategoryPrefix,
  heading,
  subheading,
  emptyMessage,
  defaultExpandedCount,
  flagEntity,
  flagEntityId,
}: Props) {
  const { expandedIds, toggle } = usePersistedExpandedSectionIds({
    sectionIds: sections.map((section) => section.id),
    defaultExpandedCount: defaultExpandedCount ?? sections.length,
    desktopOnlyDefaults: false,
  });

  if (sections.length === 0) {
    return (
      <div className="space-y-3">
        {emptyMessage ? <div>{emptyMessage}</div> : null}
        {flagEntity && flagEntityId ? (
          <ListingFieldFlagNote
            entity={flagEntity}
            entityId={flagEntityId}
            field="listings"
            pageTitle={placeName}
            pageSlug={placeSlug}
            addHref={ADD_BUSINESS_HREF}
          />
        ) : null}
      </div>
    );
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
            action={
              <Link
                href={sectionHubPath(section.slug)}
                {...gaClickProps({
                  event: "nav_click",
                  category: `${analyticsCategoryPrefix}_category_hub`,
                  label: section.slug,
                })}
                className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
              >
                Full {section.title.toLowerCase()} hub
              </Link>
            }
          >
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {businessItems.map((business) => (
                <li key={business.id} className="h-full">
                  <BusinessPreviewCard
                    name={business.name}
                    slug={business.slug}
                    excerpt={business.excerpt}
                    heroImageUrl={business.heroImageUrl}
                    meta={placeName}
                    analyticsCategory={`${analyticsCategoryPrefix}_business`}
                    analyticsLabel={`${placeSlug}_${business.slug}`}
                  />
                </li>
              ))}
            </ul>
          </CollapsibleBrowseSection>
        );
      })}

      {flagEntity && flagEntityId ? (
        <ListingFieldFlagNote
          entity={flagEntity}
          entityId={flagEntityId}
          field="listings"
          pageTitle={placeName}
          pageSlug={placeSlug}
          addHref={ADD_BUSINESS_HREF}
        />
      ) : null}
    </div>
  );
}
