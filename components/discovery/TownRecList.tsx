import Link from "next/link";
import type { EnrichedRecommendationPayload } from "@/lib/search/recommendation-set";
import { TagPills } from "@/components/discovery/TagPills";

type Props = { enriched: EnrichedRecommendationPayload };

/** Server-rendered picks (no save / feedback — consumer policy: no prominent stars). */
export function TownRecList({ enriched }: Props) {
  if (!enriched.recommendations.length) {
    return (
      <p className="text-sm text-[var(--color-text-tertiary)]">
        No listings match yet.
      </p>
    );
  }
  return (
    <ul className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
      {enriched.recommendations.map((r) => {
        const b = r.business as {
          name?: string;
          slug?: string;
          lat?: number;
          lng?: number;
          website?: string | null;
          tags?: string[];
        };
        const m = b.lat != null && b.lng != null;
        return (
          <li
            key={r.business_id}
            className="min-w-[280px] max-w-sm shrink-0 snap-start rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-premium-sm transition-premium hover-lift sm:min-w-[300px]"
          >
            {b.slug ? (
              <Link
                href={`/business/${b.slug}`}
                className="text-lg font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-primary)] transition-colors"
              >
                {b.name ?? "Business"}
              </Link>
            ) : (
              <p className="text-lg font-semibold text-[var(--color-text-primary)]">
                {b.name ?? "Business"}
              </p>
            )}
            <p className="text-sm font-medium text-[var(--color-primary)]">
              {r.headline}
            </p>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)] line-clamp-2">
              {r.explanation}
            </p>
            <TagPills
              tags={[...(r.highlighted_tags ?? []), ...(b.tags ?? [])]}
              max={5}
            />
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              {m ? (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--color-primary)] hover:underline"
                >
                  Directions
                </a>
              ) : null}
              {b.website ? (
                <a
                  href={b.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--color-primary)] hover:underline"
                >
                  Website
                </a>
              ) : null}
              {b.slug ? (
                <Link
                  href={`/business/${b.slug}`}
                  className="text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)] hover:underline"
                >
                  Details
                </Link>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
