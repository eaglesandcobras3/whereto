"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { BusinessPreviewCard } from "@/components/discovery/BusinessPreviewCard";
import { ListingFieldFlagNote } from "@/components/business/ListingFieldFlagNote";
import { CollapsibleBrowseSection } from "@/components/ui/collapsible-browse-section";
import type { CategoryBusinessRow, CategoryTownGroup } from "@/lib/data/category-hub";
import { usePersistedExpandedSectionIds } from "@/lib/hooks/use-persisted-expanded-section-ids";
import { ADD_BUSINESS_HREF } from "@/lib/listing-requests/listing-field-flag";
import { browseSectionBySlug } from "@/lib/categories/unified-browse";
import { townIntentPath } from "@/lib/routes/town-intent-path";
import { gaClickProps } from "@/lib/analytics/ga-click-props";

type Props = {
  townGroups: CategoryTownGroup[];
  /** No-town listings — shown as a separate regional section, not under “By town”. */
  regional?: CategoryBusinessRow[];
  categorySlug: string;
  emptyMessage?: ReactNode;
  flagEntity?: "category" | "hub";
  flagEntityId?: string;
  pageTitle?: string;
};

const REGIONAL_SECTION_ID = "regional";

function groupKey(group: CategoryTownGroup): string {
  return group.slug || "other";
}

function BusinessGrid({
  businesses,
  categorySlug,
  analyticsSuffix,
  townLabel,
}: {
  businesses: CategoryBusinessRow[];
  categorySlug: string;
  analyticsSuffix: string;
  townLabel?: string | null;
}) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {businesses.map((business) => (
        <li key={business.id} className="h-full">
          <BusinessPreviewCard
            name={business.name}
            slug={business.slug}
            excerpt={business.excerpt}
            heroImageUrl={business.hero_image_url}
            meta={townLabel ?? business.town_name}
            analyticsCategory="category_page_business"
            analyticsLabel={`${categorySlug}_${analyticsSuffix}_${business.slug}`}
          />
        </li>
      ))}
    </ul>
  );
}

function SectionSuggest({
  flagEntity,
  flagEntityId,
  pageTitle,
  pageSlug,
  section,
}: {
  flagEntity?: "category" | "hub";
  flagEntityId?: string;
  pageTitle?: string;
  pageSlug: string;
  section: string;
}) {
  if (!flagEntity) return null;
  return (
    <ListingFieldFlagNote
      entity={flagEntity}
      entityId={flagEntityId}
      field="listings"
      section={section}
      pageTitle={pageTitle}
      pageSlug={pageSlug}
      addHref={ADD_BUSINESS_HREF}
    />
  );
}

export function CategoryHubTownSections({
  townGroups,
  regional = [],
  categorySlug,
  emptyMessage,
  flagEntity,
  flagEntityId,
  pageTitle,
}: Props) {
  const sectionIds = [
    ...townGroups.map(groupKey),
    ...(regional.length > 0 ? [REGIONAL_SECTION_ID] : []),
  ];
  const { expandedIds, toggle } = usePersistedExpandedSectionIds({
    sectionIds,
    // Open every town/regional section by default on all breakpoints.
    defaultExpandedCount: sectionIds.length,
    desktopOnlyDefaults: false,
  });
  const hasTownIntentPage = Boolean(browseSectionBySlug(categorySlug));

  if (townGroups.length === 0 && regional.length === 0) {
    return (
      <div className="space-y-3">
        {emptyMessage ? <div>{emptyMessage}</div> : null}
        <SectionSuggest
          flagEntity={flagEntity}
          flagEntityId={flagEntityId}
          pageTitle={pageTitle}
          pageSlug={categorySlug}
          section={pageTitle || categorySlug}
        />
      </div>
    );
  }

  return (
    <div className="space-y-10 sm:space-y-12">
      {townGroups.length > 0 ? (
        <div className="space-y-6 sm:space-y-8">
          <div>
            <h2 className="font-headline text-xl font-bold text-[var(--color-text-primary)] sm:text-2xl">
              By town
            </h2>
            <p className="mt-1.5 text-left text-sm leading-relaxed text-[var(--color-text-secondary)] sm:mt-2">
              Places with a location along 30A. Open a town page for the full list in that
              category.
            </p>
          </div>

          {townGroups.map((group) => {
            const id = groupKey(group);
            const isOpen = expandedIds.has(id);
            const townIntentHref =
              group.slug && hasTownIntentPage
                ? townIntentPath(group.slug, categorySlug)
                : null;

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
                action={
                  townIntentHref ? (
                    <Link
                      href={townIntentHref}
                      {...gaClickProps({
                        event: "nav_click",
                        category: "category_hub_town_intent_link",
                        label: `${group.slug}:${categorySlug}`,
                      })}
                      className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
                    >
                      View all in {group.name}
                    </Link>
                  ) : null
                }
              >
                <BusinessGrid
                  businesses={group.businesses}
                  categorySlug={categorySlug}
                  analyticsSuffix={id}
                  townLabel={group.name}
                />
              </CollapsibleBrowseSection>
            );
          })}
        </div>
      ) : null}

      {regional.length > 0 ? (
        <div className="space-y-6 sm:space-y-8">
          <div>
            <h2 className="font-headline text-xl font-bold text-[var(--color-text-primary)] sm:text-2xl">
              Regional &amp; by appointment
            </h2>
            <p className="mt-1.5 text-left text-sm leading-relaxed text-[var(--color-text-secondary)] sm:mt-2">
              Providers who serve the corridor without a single storefront town — mobile, remote, or
              by appointment.
            </p>
          </div>

          <CollapsibleBrowseSection
            sectionId={REGIONAL_SECTION_ID}
            title="Serves South Walton"
            subtitle={`${regional.length} ${regional.length === 1 ? "provider" : "providers"}`}
            icon={
              <span className="material-symbols-outlined text-xl" aria-hidden>
                near_me
              </span>
            }
            open={expandedIds.has(REGIONAL_SECTION_ID)}
            onToggle={() => toggle(REGIONAL_SECTION_ID)}
          >
            <BusinessGrid
              businesses={regional}
              categorySlug={categorySlug}
              analyticsSuffix="regional"
              townLabel="Regional"
            />
          </CollapsibleBrowseSection>
        </div>
      ) : null}

      <SectionSuggest
        flagEntity={flagEntity}
        flagEntityId={flagEntityId}
        pageTitle={pageTitle}
        pageSlug={categorySlug}
        section={pageTitle || categorySlug}
      />
    </div>
  );
}
