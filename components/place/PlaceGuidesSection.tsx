import Link from "next/link";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import { PlaceRelatedSection } from "@/components/place/PlaceRelatedSection";
import type { TownGuideCard } from "@/lib/data/town-hub";

type Props = {
  title: string;
  description?: string;
  guides: TownGuideCard[];
  analyticsCategory?: string;
};

/**
 * Town/area guides — compact text cards (same density as business RelatedGuidesSection),
 * no hero images so the section stays secondary on mobile.
 */
export function PlaceGuidesSection({
  title,
  description,
  guides,
  analyticsCategory = "place_guides",
}: Props) {
  if (guides.length === 0) return null;

  return (
    <PlaceRelatedSection title={title} description={description} layout="grid">
      {guides.map((guide) => (
        <Link
          key={guide.id}
          href={`/guide/${guide.slug}`}
          {...gaClickProps({
            event: "nav_click",
            category: analyticsCategory,
            label: guide.slug,
          })}
          className="group flex h-full flex-col gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 transition-colors hover:border-[var(--color-primary)] sm:p-4"
        >
          <span className="text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] sm:text-base">
            {guide.title}
          </span>
          {guide.subtitle ? (
            <span className="text-xs leading-relaxed text-[var(--color-text-secondary)] line-clamp-2 sm:text-sm">
              {guide.subtitle}
            </span>
          ) : null}
          <span className="mt-auto inline-flex items-center gap-1 pt-1 text-xs font-semibold text-[var(--color-primary)] sm:text-sm">
            Read guide
            <span className="material-symbols-outlined !text-sm transition-transform group-hover:translate-x-0.5">
              arrow_forward
            </span>
          </span>
        </Link>
      ))}
    </PlaceRelatedSection>
  );
}
