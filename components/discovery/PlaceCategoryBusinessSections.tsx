import type { ReactNode } from "react";
import Link from "next/link";
import { BusinessPreviewCard } from "@/components/discovery/BusinessPreviewCard";
import {
  PLACE_CATEGORY_ICONS,
  type PlaceCategorySection,
} from "@/lib/data/place-category-sections";
import { gaClickProps } from "@/lib/analytics/ga-click-props";

type Props = {
  placeName: string;
  placeSlug: string;
  sections: PlaceCategorySection[];
  buildSectionSearchHref: (section: PlaceCategorySection) => string;
  analyticsCategoryPrefix: string;
  heading?: string;
  subheading?: string;
  emptyMessage?: ReactNode;
};

export function PlaceCategoryBusinessSections({
  placeName,
  placeSlug,
  sections,
  buildSectionSearchHref,
  analyticsCategoryPrefix,
  heading,
  subheading,
  emptyMessage,
}: Props) {
  if (sections.length === 0) {
    return emptyMessage ? <div>{emptyMessage}</div> : null;
  }

  return (
    <div className="space-y-12">
      <div>
        <h2 className="font-headline text-2xl font-bold text-[var(--color-text-primary)]">
          {heading ?? `Local businesses in ${placeName}`}
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          {subheading ?? "Browse by category. Every listing is linked below."}
        </p>
      </div>
      {sections.map((section) => {
        const icon = section.slug
          ? (PLACE_CATEGORY_ICONS[section.slug] ?? "storefront")
          : "storefront";

        return (
          <section key={section.id} aria-labelledby={`place-cat-${placeSlug}-${section.id}`}>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-container-high)] text-[var(--color-primary)]">
                  <span className="material-symbols-outlined text-xl">{icon}</span>
                </span>
                <div>
                  <h3
                    id={`place-cat-${placeSlug}-${section.id}`}
                    className="font-headline text-xl font-bold text-[var(--color-text-primary)]"
                  >
                    {section.title}
                  </h3>
                  <p className="text-xs text-[var(--color-text-tertiary)]">
                    {section.totalCount} {section.totalCount === 1 ? "listing" : "listings"}
                  </p>
                </div>
              </div>
              {section.totalCount > section.businesses.length ? (
                <Link
                  href={buildSectionSearchHref(section)}
                  {...gaClickProps({
                    event: "nav_click",
                    category: analyticsCategoryPrefix,
                    label: `${placeSlug}_${section.slug}`,
                  })}
                  className="text-sm font-semibold text-[var(--color-primary)] hover:underline"
                >
                  View all {section.totalCount}
                </Link>
              ) : null}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
              {section.businesses.map((b) => (
                <BusinessPreviewCard
                  key={b.id}
                  name={b.name}
                  slug={b.slug}
                  excerpt={b.ai_summary}
                  heroImageUrl={b.hero_image_url}
                  analyticsCategory={`${analyticsCategoryPrefix}_business`}
                  analyticsLabel={`${placeSlug}_${b.slug}`}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
