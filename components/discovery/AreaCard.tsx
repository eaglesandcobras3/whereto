import Link from "next/link";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  slug: string;
  subtitle?: string;
  imageUrl?: string | null;
  analyticsCategory?: string;
  fullWidth?: boolean;
};

export function AreaCard({
  name,
  slug,
  subtitle,
  imageUrl,
  analyticsCategory = "area_card",
  fullWidth = false,
}: Props) {
  return (
    <Link
      href={`/area/${slug}`}
      {...gaClickProps({ event: "nav_click", category: analyticsCategory, label: slug })}
      className={cn(
        "group block overflow-hidden rounded-[var(--radius-listing)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-premium-sm transition-premium hover-lift",
        fullWidth && "w-full",
      )}
    >
      <div
        className={cn(
          "flex items-start",
          fullWidth ? "gap-4 p-5 sm:gap-6 sm:p-6" : "gap-3 p-4 sm:gap-4 sm:p-5",
        )}
      >
        <div
          className={cn(
            "relative aspect-[2/3] shrink-0 overflow-hidden rounded-xl bg-[var(--color-surface-container-high)]",
            fullWidth ? "w-28 sm:w-36 md:w-44" : "w-24 sm:w-28 md:w-32",
          )}
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

        <div className="min-w-0 flex-1 space-y-3">
          <h3
            className={cn(
              "font-headline font-bold tracking-tight text-[var(--color-text-primary)]",
              fullWidth ? "text-xl sm:text-2xl" : "text-lg sm:text-xl",
            )}
          >
            {name}
          </h3>
          {subtitle ? (
            <p className={cn("text-listing-meta", fullWidth ? "line-clamp-3 sm:line-clamp-2" : "line-clamp-2")}>
              {subtitle}
            </p>
          ) : (
            <p className="text-listing-meta text-[var(--color-text-tertiary)]">
              Shops, dining, and local spots
            </p>
          )}
          <p
            className="
              inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider
              text-[var(--color-primary)]
              transition-colors group-hover:text-[var(--color-primary-light)]
            "
          >
            Explore area
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
