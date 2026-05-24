import Link from "next/link";
import type { EnrichedRecommendationPayload } from "@/lib/search/recommendation-set";
import { TagPills } from "@/components/discovery/TagPills";
import { ListingThumbnail } from "@/components/discovery/ListingThumbnail";
import { externalWebsiteHref } from "@/lib/urls/external-website-href";
import { gaClickProps } from "@/lib/analytics/ga-click-props";

type Props = {
  enriched: EnrichedRecommendationPayload;
  /** GA4 delegated click **`event_category`** — e.g. SEO intent page vs town guide */
  analyticsListKey?: string;
};

/** SEO-friendly vertical stack of picks (no prominent stars). */
export function TownRecListVertical({ enriched, analyticsListKey = "town_intent_recs" }: Props) {
  if (!enriched.recommendations.length) {
    return (
      <p className="text-sm text-[var(--color-text-tertiary)]">
        No listings match yet.
      </p>
    );
  }
  return (
    <ul className="space-y-5">
      {enriched.recommendations.map((r) => {
        const b = r.business as {
          name?: string;
          slug?: string;
          website?: string | null;
          tags?: string[];
          image_url?: string | null;
        };
        const seed = b.slug ?? r.business_id;
        const listLabel = String(b.slug ?? r.business_id);
        const websiteHref = externalWebsiteHref(b.website ?? null);
        return (
          <li
            key={r.business_id}
            className="group overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-premium-sm transition-premium hover-lift"
          >
            {b.slug ? (
              <Link
                href={`/business/${b.slug}`}
                {...gaClickProps({
                  event: "nav_click",
                  category: analyticsListKey,
                  label: `${listLabel}_thumb`,
                })}
                className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
              >
                <ListingThumbnail
                  slug={seed}
                  imageUrl={b.image_url}
                  rounded="none"
                  className="aspect-[21/9] min-h-[140px] max-h-[220px] rounded-none sm:aspect-[3/1]"
                />
              </Link>
            ) : (
              <ListingThumbnail
                slug={seed}
                imageUrl={b.image_url}
                rounded="none"
                className="aspect-[21/9] min-h-[140px] max-h-[220px] rounded-none sm:aspect-[3/1]"
              />
            )}
            <div className="space-y-3 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  {b.slug ? (
                    <Link
                      href={`/business/${b.slug}`}
                      {...gaClickProps({
                        event: "nav_click",
                        category: analyticsListKey,
                        label: `${listLabel}_title`,
                      })}
                      className="text-xl font-semibold tracking-tight text-[var(--color-text-primary)] hover:text-[var(--color-primary)] transition-colors"
                    >
                      {b.name ?? "Business"}
                    </Link>
                  ) : (
                    <p className="text-xl font-semibold tracking-tight text-[var(--color-text-primary)]">
                      {b.name ?? "Business"}
                    </p>
                  )}
                  <p className="text-sm font-medium text-[var(--color-primary)]">
                    {r.headline}
                  </p>
                </div>
                {b.slug ? (
                  <Link
                    href={`/business/${b.slug}`}
                    {...gaClickProps({
                      event: "nav_click",
                      category: analyticsListKey,
                      label: `${listLabel}_view_btn`,
                    })}
                    className="shrink-0 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-secondary)] transition-colors"
                  >
                    View
                  </Link>
                ) : null}
              </div>
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                {r.explanation}
              </p>
              <TagPills
                tags={[...(r.highlighted_tags ?? []), ...(b.tags ?? [])]}
                colored
              />
              <div className="flex flex-wrap gap-4 text-sm">
                {websiteHref ? (
                  <a
                    href={websiteHref}
                    {...gaClickProps({
                      event: "outbound_click",
                      category: analyticsListKey,
                      label: listLabel,
                    })}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:underline"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                      />
                    </svg>
                    Website
                  </a>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
