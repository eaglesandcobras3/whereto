import Link from "next/link";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import { ListingThumbnail } from "@/components/discovery/ListingThumbnail";

type Props = {
  title: string;
  slug: string;
  href?: string;
  subtitle?: string;
  imageUrl?: string | null;
  analyticsCategory?: string;
};

export function GuideCard({
  title,
  slug,
  href,
  subtitle,
  imageUrl,
  analyticsCategory = "guide_card",
}: Props) {
  const hasImage = Boolean(imageUrl?.trim());

  return (
    <Link
      href={href ?? `/guide/${slug}`}
      {...gaClickProps({ event: "nav_click", category: analyticsCategory, label: slug })}
      className="
        group block overflow-hidden rounded-[var(--radius-listing)]
        border border-[var(--color-border)] bg-[var(--color-surface)]
        shadow-premium-sm
        transition-premium hover-lift
      "
    >
      {hasImage ? (
        <ListingThumbnail
          slug={slug}
          imageUrl={imageUrl}
          imageAlt={title}
          className="aspect-[16/10] min-h-[140px]"
        />
      ) : null}
      <div className="space-y-3 p-4 sm:p-5">
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
    </Link>
  );
}
