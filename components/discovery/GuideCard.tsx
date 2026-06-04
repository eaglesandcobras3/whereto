import Link from "next/link";
import { guideHeroGradient } from "@/lib/guides/hero-gradient";
import { gaClickProps } from "@/lib/analytics/ga-click-props";

type Props = {
  title: string;
  slug: string;
  subtitle?: string;
  imageUrl?: string | null;
  analyticsCategory?: string;
};

export function GuideCard({
  title,
  slug,
  subtitle,
  imageUrl,
  analyticsCategory = "guide_card",
}: Props) {
  return (
    <Link
      href={`/guide/${slug}`}
      {...gaClickProps({ event: "nav_click", category: analyticsCategory, label: slug })}
      className="
        group block overflow-hidden rounded-[var(--radius-listing)]
        border border-[var(--color-border)] bg-[var(--color-surface)]
        shadow-premium-sm
        transition-premium hover-lift
      "
    >
      <div className="flex items-start gap-3 p-4 sm:gap-4 sm:p-5">
        <div
          className="relative aspect-[2/3] w-24 shrink-0 overflow-hidden rounded-xl sm:w-28 md:w-32"
          aria-hidden
        >
          <div
            className={`
              absolute inset-0 bg-gradient-to-br ${guideHeroGradient(slug)}
              transition-transform duration-700 ease-out
              group-hover:scale-[1.03]
            `}
          >
            {imageUrl ? (
              <img src={imageUrl} alt={title} className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <h3 className="font-headline text-lg font-bold tracking-tight text-[var(--color-text-primary)] sm:text-xl">
            {title}
          </h3>
          {subtitle ? (
            <p className="text-listing-meta line-clamp-2">{subtitle}</p>
          ) : (
            <p className="text-listing-meta text-[var(--color-text-tertiary)]">
              Local tips for planning your 30A trip
            </p>
          )}
          <p
            className="
              inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider
              text-[var(--color-primary)]
              transition-colors group-hover:text-[var(--color-primary-light)]
            "
          >
            Read guide
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
