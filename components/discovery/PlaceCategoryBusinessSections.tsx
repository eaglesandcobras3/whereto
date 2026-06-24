"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { BusinessPreviewCarousel } from "@/components/discovery/BusinessPreviewCarousel";
import { BusinessPreviewCard } from "@/components/discovery/BusinessPreviewCard";
import {
  PLACE_CATEGORY_ICONS,
  type PlaceCategorySection,
} from "@/lib/data/place-category-shared";
import { categoryHubPath } from "@/lib/routes/category-hub-path";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import { cn } from "@/lib/utils";

type Props = {
  placeName: string;
  placeSlug: string;
  sections: PlaceCategorySection[];
  analyticsCategoryPrefix: string;
  heading?: string;
  subheading?: string;
  emptyMessage?: ReactNode;
  /** How many categories to show expanded by default. */
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
  defaultExpandedCount = 4,
}: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (let i = 0; i < Math.min(defaultExpandedCount, sections.length); i++) {
      initial.add(sections[i]!.id);
    }
    return initial;
  });
  const [gridIds, setGridIds] = useState<Set<string>>(new Set());

  if (sections.length === 0) {
    return emptyMessage ? <div>{emptyMessage}</div> : null;
  }

  function toggle(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h2 className="font-headline text-xl font-bold text-[var(--color-text-primary)] sm:text-2xl">
          {heading ?? `Local businesses in ${placeName}`}
        </h2>
        <p className="mt-1.5 text-left text-sm leading-relaxed text-[var(--color-text-secondary)] sm:mt-2">
          {subheading ?? "Browse by category. Tap a section to expand."}
        </p>
      </div>

      {sections.map((section) => {
        const icon = section.slug
          ? (PLACE_CATEGORY_ICONS[section.slug] ?? "storefront")
          : "storefront";
        const headingId = `place-cat-${placeSlug}-${section.id}`;
        const isOpen = expandedIds.has(section.id);
        const isGrid = gridIds.has(section.id);

        const businessItems = section.businesses.map((business) => ({
          id: business.id,
          name: business.name,
          slug: business.slug,
          excerpt: business.ai_summary,
          heroImageUrl: business.hero_image_url,
        }));

        return (
          <section key={section.id} aria-labelledby={headingId}>
            <button
              type="button"
              onClick={() => toggle(section.id)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-3 text-left"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-container-high)] text-[var(--color-primary)]">
                <span className="material-symbols-outlined text-xl">{icon}</span>
              </span>
              <div className="min-w-0 flex-1">
                <h3
                  id={headingId}
                  className="font-headline text-lg font-bold text-[var(--color-text-primary)] sm:text-xl"
                >
                  {section.title}
                </h3>
                <p className="text-xs text-[var(--color-text-tertiary)]">
                  {section.totalCount} {section.totalCount === 1 ? "listing" : "listings"}
                </p>
              </div>
              <span
                className={cn(
                  "material-symbols-outlined shrink-0 text-[var(--color-text-tertiary)] transition-transform duration-200",
                  isOpen && "rotate-180",
                )}
                aria-hidden
              >
                expand_more
              </span>
            </button>

            {section.totalCount > section.businesses.length ? (
              <div className={cn("mt-2 pl-[3.25rem]", !isOpen && "sr-only")}>
                <Link
                  href={categoryHubPath(section.slug)}
                  {...gaClickProps({
                    event: "nav_click",
                    category: analyticsCategoryPrefix,
                    label: `${placeSlug}_${section.slug}`,
                  })}
                  className="text-sm font-semibold text-[var(--color-primary)] hover:underline"
                >
                  View all {section.totalCount}
                </Link>
              </div>
            ) : null}

            <div
              className={isOpen ? "pt-4" : "h-0 overflow-hidden"}
              aria-hidden={!isOpen}
            >
              {isGrid ? (
                <ul
                  aria-labelledby={headingId}
                  className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {businessItems.map((business) => (
                    <li key={business.id}>
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
              ) : (
                <BusinessPreviewCarousel
                  labelledBy={headingId}
                  businesses={businessItems}
                  analyticsCategory={`${analyticsCategoryPrefix}_business`}
                  analyticsLabelPrefix={placeSlug}
                />
              )}

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setGridIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(section.id)) next.delete(section.id);
                    else next.add(section.id);
                    return next;
                  })}
                  className="text-xs text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-primary)]"
                >
                  {isGrid ? "View less" : "View more"}
                </button>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
