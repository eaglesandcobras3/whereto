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
 * Town/area guides — vertically stacked cards with an optional horizontal
 * thumbnail above the existing title/subtitle/CTA content.
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
      {guides.map((guide) => {
        const imageUrl = guide.hero_image_url?.trim() || null;

        return (
          <Link
            key={guide.id}
            href={`/guide/${guide.slug}`}
            {...gaClickProps({
              event: "nav_click",
              category: analyticsCategory,
              label: guide.slug,
            })}
            className="group flex h-full flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-colors hover:border-[var(--color-primary)]"
          >
            {imageUrl ? (
              <div className="w-full shrink-0 overflow-hidden bg-[var(--color-background)]">
                {/* eslint-disable-next-line @next/next/no-img-element -- remote CDN/Storage URLs; keep intrinsic aspect ratio */}
                <img
                  src={imageUrl}
                  alt={guide.title}
                  className="block h-auto w-full"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            ) : null}
            <div className="flex flex-1 flex-col gap-1.5 p-3.5 sm:p-4">
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
            </div>
          </Link>
        );
      })}
    </PlaceRelatedSection>
  );
}
