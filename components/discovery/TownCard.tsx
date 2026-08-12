import Link from "next/link";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import { townPagePath } from "@/lib/routes/town-page-path";

type Props = {
  name: string;
  slug: string;
  subtitle?: string;
  /** Optional real image URL */
  imageUrl?: string | null;
  /** Show compact variant */
  compact?: boolean;
  /** GA4 delegated click **`event_category`** */
  analyticsCategory?: string;
};

export function TownCard({
  name,
  slug,
  subtitle,
  imageUrl,
  compact = false,
  analyticsCategory = "town_card",
}: Props) {
  return (
    <Link
      href={townPagePath(slug)}
      {...gaClickProps({ event: "nav_click", category: analyticsCategory, label: slug })}
      className={`
        group block overflow-hidden rounded-[var(--radius-listing)]
        border border-[var(--color-border)] bg-[var(--color-surface)]
        shadow-premium-sm
        transition-premium hover-lift
      `}
    >
      <div className={compact ? "space-y-3 p-4" : "flex items-start gap-3 p-4 sm:gap-4 sm:p-5"}>
        <div
          className={
            compact
              ? "relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-[var(--color-surface-container-high)]"
              : "relative aspect-[2/3] w-24 shrink-0 overflow-hidden rounded-xl bg-[var(--color-surface-container-high)] sm:w-28 md:w-32"
          }
          aria-hidden
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              loading="lazy"
              decoding="async"
            />
          ) : null}
        </div>

        {/* Structured body (Apartments-style): title → description → action */}
        <div className="min-w-0 flex-1 space-y-3">
          <h3
            className={`font-headline font-bold tracking-tight text-[var(--color-text-primary)] ${compact ? "text-base" : "text-lg sm:text-xl"}`}
          >
            {name}
          </h3>
          {subtitle ? (
            <p className="text-listing-meta line-clamp-2">
              {subtitle}
            </p>
          ) : (
            <p className="text-listing-meta text-[var(--color-text-tertiary)]">
              Full guide &amp; curated picks
            </p>
          )}
          <p
            className={`
              inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider
              text-[var(--color-primary)]
              transition-colors group-hover:text-[var(--color-primary-light)]
            `}
          >
            View town guide
            <svg
              className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </p>
        </div>
      </div>
    </Link>
  );
}
