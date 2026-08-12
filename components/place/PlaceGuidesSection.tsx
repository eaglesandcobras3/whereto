import Link from "next/link";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import { ListingThumbnail } from "@/components/discovery/ListingThumbnail";
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
    <div className="space-y-3 sm:space-y-4">
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
                <ListingThumbnail
                  slug={guide.slug}
                  imageUrl={imageUrl}
                  imageAlt={guide.title}
                  className="aspect-[16/10] w-full"
                  rounded="none"
                />
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
      <Link
        href="/guides"
        {...gaClickProps({
          event: "nav_click",
          category: analyticsCategory,
          label: "explore_more_guides",
        })}
        className="group inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)] transition-colors"
      >
        <span className="underline-offset-2 group-hover:underline">Explore more guides</span>
        <span className="material-symbols-outlined !text-base" aria-hidden>
          arrow_forward
        </span>
      </Link>
    </div>
  );
}
