import Link from "next/link";
import Image from "next/image";
import { businessListingImageUrl } from "@/lib/media/place-photo";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import { cn } from "@/lib/utils";

/** Portrait thumb column — keep in sync with CARD_MIN_HEIGHT below. */
const IMAGE_COL_WIDTH = "w-28 sm:w-32 md:w-36";
const IMAGE_ASPECT = "aspect-[2/3]";
/** Min card height = 2:3 portrait column at each breakpoint (w-28 → 10.5rem, etc.). */
const CARD_MIN_HEIGHT = "min-h-[10.5rem] sm:min-h-[12rem] md:min-h-[13.5rem]";

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
  /** Force text-only layout even when an image exists. */
  hideImage?: boolean;
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
  hideImage = false,
}: Props) {
  const thumb = hideImage ? null : businessListingImageUrl(heroImageUrl ?? null);
  const showImage = Boolean(thumb);

  return (
    <Link
      href={`/business/${slug}`}
      {...gaClickProps({
        event: "nav_click",
        category: analyticsCategory,
        label: analyticsLabel,
      })}
      className={cn(
        "editorial-card group h-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm transition-all hover:border-[var(--color-primary)]/40 hover:shadow-md",
        CARD_MIN_HEIGHT,
        showImage ? "flex flex-row items-stretch gap-0" : "flex flex-col",
      )}
    >
      {showImage ? (
        <div
          className={cn(
            "relative shrink-0 self-start bg-[var(--color-surface-container-high)]",
            IMAGE_ASPECT,
            IMAGE_COL_WIDTH,
          )}
        >
          <Image
            src={thumb!}
            alt={name}
            fill
            unoptimized
            className="object-cover"
            sizes="(min-width: 768px) 9rem, 7rem"
          />
          {badge ? (
            <div className="absolute left-2 top-2 rounded-full bg-white/95 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary shadow-sm backdrop-blur-sm sm:left-3 sm:top-3 sm:px-3 sm:py-1 sm:text-xs">
              {badge}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 p-4 sm:p-5">
        <h3 className="font-headline text-lg font-bold leading-snug text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-primary)] sm:text-xl">
          {name}
        </h3>
        {meta ? <p className="text-xs text-[var(--color-text-tertiary)]">{meta}</p> : null}
        {excerpt ? (
          <p className="line-clamp-3 text-xs leading-relaxed text-[var(--color-text-secondary)]">
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
