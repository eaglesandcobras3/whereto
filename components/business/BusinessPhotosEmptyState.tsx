import Link from "next/link";
import { gaClickProps } from "@/lib/analytics/ga-click-props";

type Props = {
  businessName: string;
  /** Prefills verify/update flow when free onboard is on. */
  updateListingHref?: string;
  addPhotosHref?: string;
  className?: string;
};

/**
 * Public empty state for the Photos section when a listing has no gallery photos
 * beyond the main card image.
 */
export function BusinessPhotosEmptyState({
  businessName,
  updateListingHref,
  addPhotosHref = "/list-your-business",
  className = "",
}: Props) {
  const href = updateListingHref ?? addPhotosHref;

  return (
    <section
      aria-labelledby="business-photos-empty-heading"
      className={`rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-5 py-8 sm:px-8 ${className}`}
    >
      <h2
        id="business-photos-empty-heading"
        className="font-headline text-xl font-semibold text-zinc-900"
      >
        Photos
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-600 sm:text-base">
        No gallery photos yet for {businessName}. Own or manage this place? Add more photos so
        visitors can see the space beyond the main listing image.
      </p>
      <Link
        href={href}
        {...gaClickProps({
          event: "cta_click",
          category: "business_detail",
          label: "photos_empty_add",
        })}
        className="mt-5 inline-flex items-center justify-center rounded-xl bg-[var(--color-logo-navy)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[color-mix(in_oklch,var(--color-logo-navy),black_12%)]"
      >
        Add photos
      </Link>
    </section>
  );
}
