"use client";

import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
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
  /** How many categories to show expanded by default on desktop. All collapsed on mobile/tablet. */
  defaultExpandedCount?: number;
};

function useIsDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return desktop;
}

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
  const isDesktop = useIsDesktop();

  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (isDesktop) {
      setExpandedIds((prev) => {
        if (prev.size > 0) return prev;
        const initial = new Set<string>();
        for (let i = 0; i < Math.min(defaultExpandedCount, sections.length); i++) {
          initial.add(sections[i]!.id);
        }
        return initial;
      });
    }
  }, [isDesktop, defaultExpandedCount, sections]);

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
            </div>
          </section>
        );
      })}
    </div>
  );
}
