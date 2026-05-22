import Link from "next/link";
import type { EnrichedRecommendationPayload } from "@/lib/search/recommendation-set";
import { TagPills } from "@/components/discovery/TagPills";
import { ListingThumbnail } from "@/components/discovery/ListingThumbnail";
import { externalWebsiteHref } from "@/lib/urls/external-website-href";

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
          website?: string | null;
          tags?: string[];
          image_url?: string | null;
        };
        const seed = b.slug ?? r.business_id;
        const websiteHref = externalWebsiteHref(b.website ?? null);
        return (
          <li
            key={r.business_id}
            className="group min-w-[280px] max-w-sm shrink-0 snap-start overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-premium-sm transition-premium hover-lift sm:min-w-[300px]"
          >
            {b.slug ? (
              <Link
                href={`/business/${b.slug}`}
                className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
              >
                <ListingThumbnail slug={seed} imageUrl={b.image_url} rounded="none" className="aspect-[5/4] min-h-[156px] rounded-none" />
              </Link>
            ) : (
              <ListingThumbnail slug={seed} imageUrl={b.image_url} rounded="none" className="aspect-[5/4] min-h-[156px] rounded-none" />
            )}
            <div className="space-y-2 p-5">
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
              <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2">
                {r.explanation}
              </p>
              <TagPills
                tags={[...(r.highlighted_tags ?? []), ...(b.tags ?? [])]}
                max={5}
              />
              <div className="flex flex-wrap gap-3 text-sm pt-1">
                {websiteHref ? (
                  <a
                    href={websiteHref}
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
            </div>
          </li>
        );
      })}
    </ul>
  );
}
