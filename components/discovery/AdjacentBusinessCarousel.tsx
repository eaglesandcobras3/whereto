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
      subtitle="Hand-picked from neighboring towns — still on 30A."
    >
      <ul className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
        {businesses.map((b) => (
          <li
            key={b.id}
            className="min-w-[min(280px,85vw)] max-w-sm shrink-0 snap-start rounded-2xl border border-zinc-200/80 bg-[var(--surface-elevated)] p-5 shadow-sm"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--accent)]">
              {b.townName}
            </p>
            <p className="mt-1 text-lg font-semibold text-zinc-900">{b.name}</p>
            <p className="mt-2 line-clamp-2 text-sm text-zinc-600">
              {b.ai_summary?.trim() || "Nearby favorite worth the quick trip."}
            </p>
            <TagPills tags={b.tagSlugs.slice(0, 6)} />
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <Link
                href={`/business/${b.slug}`}
                className="font-medium text-[var(--accent)] hover:underline"
              >
                Details
              </Link>
              <Link
                href={`/${b.townSlug}`}
                className="text-zinc-500 hover:text-zinc-800 hover:underline"
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
