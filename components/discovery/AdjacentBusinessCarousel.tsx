import Link from "next/link";
import type { AdjacentBusinessPreview } from "@/lib/data/town-hub";
import { SectionBlock } from "@/components/discovery/SectionBlock";
import { TagPills } from "@/components/discovery/TagPills";

type Props = {
  businesses: AdjacentBusinessPreview[];
};

export function AdjacentBusinessCarousel({ businesses }: Props) {
  if (!businesses.length) return null;
  return (
    <SectionBlock
      title="Worth the short drive"
      subtitle="Hand-picked from neighboring towns — still on the coast."
    >
      <ul className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
        {businesses.map((b) => (
          <li
            key={b.id}
            className="min-w-[min(280px,85vw)] max-w-sm shrink-0 snap-start rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-premium-sm transition-premium hover-lift"
          >
            <p className="text-eyebrow">{b.townName}</p>
            <Link
              href={`/business/${b.slug}`}
              className="mt-1 block text-lg font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-primary)] transition-colors"
            >
              {b.name}
            </Link>
            <p className="mt-2 line-clamp-2 text-sm text-[var(--color-text-secondary)]">
              {b.ai_summary?.trim() || "Nearby favorite worth the quick trip."}
            </p>
            <TagPills tags={b.tagSlugs.slice(0, 5)} />
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <Link
                href={`/business/${b.slug}`}
                className="font-medium text-[var(--color-primary)] hover:underline"
              >
                Details
              </Link>
              <Link
                href={`/${b.townSlug}`}
                className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:underline"
              >
                {b.townName} guide
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </SectionBlock>
  );
}
