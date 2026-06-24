import Link from "next/link";
import Image from "next/image";
import { businessListingImageUrl } from "@/lib/media/place-photo";
import { gaClickProps } from "@/lib/analytics/ga-click-props";

type Props = {
  name: string;
  slug: string;
  excerpt?: string | null;
  heroImageUrl?: string | null;
  meta?: string | null;
  badge?: string | null;
  analyticsCategory: string;
  analyticsLabel: string;
  ctaLabel?: string;
};

export function BusinessPreviewCard({
  name,
  slug,
  excerpt,
  heroImageUrl,
  meta,
  badge,
  analyticsCategory,
  analyticsLabel,
  ctaLabel = "Explore",
}: Props) {
  const thumb = businessListingImageUrl(heroImageUrl ?? null);

  return (
    <Link
      href={`/business/${slug}`}
      {...gaClickProps({
        event: "nav_click",
        category: analyticsCategory,
        label: analyticsLabel,
      })}
      className="editorial-card group flex flex-row items-stretch gap-0 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm transition-all hover:border-[var(--color-primary)]/40 hover:shadow-md"
    >
      <div className="relative aspect-[2/3] w-28 shrink-0 self-start bg-[var(--color-surface-container-high)] sm:w-32 md:w-36">
        {thumb ? (
          <Image
            src={thumb}
            alt={name}
            fill
            unoptimized
            className="object-contain"
            sizes="(min-width: 768px) 9rem, 7rem"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/35 to-primary/65">
            <span className="material-symbols-outlined !text-4xl text-white/45 sm:!text-5xl">
              storefront
            </span>
          </div>
        )}
        {badge ? (
          <div className="absolute left-2 top-2 rounded-full bg-white/95 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary shadow-sm backdrop-blur-sm sm:left-3 sm:top-3 sm:px-3 sm:py-1 sm:text-xs">
            {badge}
          </div>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 p-4 sm:p-5">
        <h3 className="font-headline text-lg font-bold leading-snug text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-primary)] sm:text-xl">
          {name}
        </h3>
        {meta ? <p className="text-xs text-[var(--color-text-tertiary)]">{meta}</p> : null}
        {excerpt ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
            {excerpt}
          </p>
        ) : null}
        <span className="mt-auto inline-flex items-center gap-1 pt-1 text-sm font-semibold text-[var(--color-primary)]">
          {ctaLabel}
          <span className="material-symbols-outlined !text-sm transition-transform group-hover:translate-x-0.5">
            arrow_forward
          </span>
        </span>
      </div>
    </Link>
  );
}
