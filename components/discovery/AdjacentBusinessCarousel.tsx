import Link from "next/link";
import type { AdjacentBusinessPreview } from "@/lib/data/town-hub";
import { townPagePath } from "@/lib/routes/town-page-path";
import { SectionBlock } from "@/components/discovery/SectionBlock";
import { TagPills } from "@/components/discovery/TagPills";
import { ListingThumbnail } from "@/components/discovery/ListingThumbnail";

type Props = {
  businesses: AdjacentBusinessPreview[];
};

export function AdjacentBusinessCarousel({ businesses }: Props) {
  if (!businesses.length) return null;
  return (
    <SectionBlock
      title="Worth the short drive"
      subtitle="Hand-picked from neighboring towns, still on the coast."
    >
      <ul className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
        {businesses.map((b) => (
          <li
            key={b.id}
            className="group min-w-[min(280px,85vw)] max-w-sm shrink-0 snap-start overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-premium-sm transition-premium hover-lift"
          >
            <Link
              href={`/business/${b.slug}`}
              className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
            >
              <ListingThumbnail
                slug={b.slug}
                imageUrl={b.image_url}
                imageAlt={b.name}
                rounded="none"
                className="aspect-[5/4] min-h-[148px] rounded-none"
              />
            </Link>
            <div className="space-y-2 p-5">
              <p className="text-eyebrow">{b.townName}</p>
              <Link
                href={`/business/${b.slug}`}
                className="block text-lg font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-primary)] transition-colors"
              >
                {b.name}
              </Link>
              <p className="line-clamp-2 text-sm text-[var(--color-text-secondary)]">
                {b.ai_summary?.trim() || "Nearby favorite worth the quick trip."}
              </p>
              <TagPills tags={b.tagSlugs.slice(0, 5)} />
              <div className="flex flex-wrap gap-3 pt-1 text-sm">
                <Link
                  href={`/business/${b.slug}`}
                  className="font-medium text-[var(--color-primary)] hover:underline"
                >
                  Details
                </Link>
                <Link
                  href={townPagePath(b.townSlug)}
                  className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:underline"
                >
                  {b.townName} guide
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </SectionBlock>
  );
}
