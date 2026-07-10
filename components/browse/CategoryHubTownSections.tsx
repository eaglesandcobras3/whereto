"use client";

import { type ReactNode } from "react";
import { BusinessPreviewCard } from "@/components/discovery/BusinessPreviewCard";
import { CollapsibleBrowseSection } from "@/components/ui/collapsible-browse-section";
import type { CategoryTownGroup } from "@/lib/data/category-hub";
import { usePersistedExpandedSectionIds } from "@/lib/hooks/use-persisted-expanded-section-ids";

type Props = {
  townGroups: CategoryTownGroup[];
  categorySlug: string;
  emptyMessage?: ReactNode;
};

function groupKey(group: CategoryTownGroup): string {
  return group.slug || "other";
}

export function CategoryHubTownSections({
  townGroups,
  categorySlug,
  emptyMessage,
}: Props) {
  const { expandedIds, toggle } = usePersistedExpandedSectionIds({
    sectionIds: townGroups.map(groupKey),
    defaultExpandedCount: 1,
    desktopOnlyDefaults: false,
  });

  if (townGroups.length === 0) {
    return emptyMessage ? <div>{emptyMessage}</div> : null;
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h2 className="font-headline text-xl font-bold text-[var(--color-text-primary)] sm:text-2xl">
          By town
        </h2>
        <p className="mt-1.5 text-left text-sm leading-relaxed text-[var(--color-text-secondary)] sm:mt-2">
          Listings grouped by community. Tap a town to expand.
        </p>
      </div>

      {townGroups.map((group) => {
        const id = groupKey(group);
        const isOpen = expandedIds.has(id);

        return (
          <CollapsibleBrowseSection
            key={id}
            title={group.name}
            subtitle={`${group.totalCount} ${group.totalCount === 1 ? "listing" : "listings"}`}
            icon={
              <span className="material-symbols-outlined text-xl" aria-hidden>
                location_city
              </span>
            }
            open={isOpen}
            onToggle={() => toggle(id)}
          >
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.businesses.map((business) => (
                <li key={business.id} className="h-full">
                  <BusinessPreviewCard
                    name={business.name}
                    slug={business.slug}
                    excerpt={business.excerpt}
                    heroImageUrl={business.hero_image_url}
                    analyticsCategory="category_page_business"
                    analyticsLabel={`${categorySlug}_${business.slug}`}
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
