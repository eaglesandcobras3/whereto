import Image from "next/image";
import Link from "next/link";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import type { HomePortraitItem } from "@/lib/home/homepage-portrait";
import { cn } from "@/lib/utils";

/**
 * Featured Today strip: four portrait cards on desktop, native horizontal
 * snap-scroll when items overflow (mobile, or more than four cards).
 * 3 × gap-5 (1.25rem) = 3.75rem between four columns.
 */
const CARD_WIDTH =
  "w-[calc((100%-3.75rem)/4)] max-md:min-w-[150px] shrink-0 snap-start";

type Props = {
  items: HomePortraitItem[];
  labelledBy?: string;
};

export function HomePortraitScroll({ items, labelledBy }: Props) {
  if (items.length === 0) return null;

  return (
    <div
      role="list"
      aria-labelledby={labelledBy}
      className="flex flex-nowrap gap-5 overflow-x-auto overscroll-x-contain pb-2 snap-x snap-mandatory [scrollbar-width:thin]"
    >
      {items.map((item) => (
        <Link
          key={item.href}
          role="listitem"
          href={item.href}
          {...gaClickProps({
            event: "nav_click",
            category: item.analyticsCategory,
            label: item.analyticsLabel,
          })}
          className={cn("group flex h-full flex-col", CARD_WIDTH)}
        >
          <div className="relative aspect-[2/3] w-full max-md:max-w-[150px] overflow-hidden rounded-[var(--radius-listing)] bg-[var(--color-surface-container-high)]">
            {item.imageUrl ? (
              <Image
                src={item.imageUrl}
                alt={item.title}
                fill
                unoptimized
                loading="lazy"
                className="object-cover"
                sizes="(min-width: 768px) 25vw, 150px"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/35 to-primary/65" />
            )}
          </div>
          <div className="flex flex-1 flex-col pt-2 md:pt-4">
            {item.eyebrow ? (
              <p className="text-eyebrow mb-1 tracking-[0.12em] max-md:!text-[0.625rem] md:mb-2">
                {item.eyebrow}
              </p>
            ) : null}
            <h3 className="font-headline text-sm font-bold leading-snug tracking-tight text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-primary)] md:text-xl">
              {item.title}
            </h3>
            {item.excerpt ? (
              <p className="mt-1.5 line-clamp-2 text-[0.6875rem] leading-snug text-[var(--color-text-secondary)] md:mt-2 md:line-clamp-3 md:text-sm md:leading-relaxed">
                {item.excerpt}
              </p>
            ) : null}
            <span className="mt-auto inline-flex items-center gap-1 pt-2 text-xs font-semibold text-[var(--color-primary)] md:pt-4 md:text-sm">
              {item.ctaLabel}
              <span className="material-symbols-outlined !text-sm transition-transform group-hover:translate-x-0.5">
                arrow_forward
              </span>
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
