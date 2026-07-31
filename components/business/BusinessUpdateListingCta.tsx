import Link from "next/link";
import { gaClickProps } from "@/lib/analytics/ga-click-props";

type Props = {
  updateListingHref: string;
  analyticsLabel?: string;
  className?: string;
};

/**
 * Bottom-of-page CTA for business owners to update their public listing.
 * Dark navy banner — matches ListBusinessHomeCta styling.
 */
export function BusinessUpdateListingCta({
  updateListingHref,
  analyticsLabel,
  className = "",
}: Props) {
  return (
    <section
      aria-labelledby="business-update-listing-heading"
      className={`rounded-2xl bg-[var(--color-logo-navy)] px-6 py-8 sm:px-8 sm:py-9 md:px-10 ${className}`}
    >
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-10">
        <div className="min-w-0 max-w-2xl">
          <h2
            id="business-update-listing-heading"
            className="font-headline text-xl font-bold tracking-tight text-white sm:text-2xl"
          >
            Own or manage this business?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/75 sm:text-base">
            Keep your listing accurate by updating your business description, phone number, website,
            and search tags for free.
          </p>
        </div>
        <Link
          href={updateListingHref}
          {...gaClickProps({
            event: "cta_click",
            category: "business_detail",
            label: analyticsLabel ?? "update_this_listing",
          })}
          className="inline-flex w-full shrink-0 items-center justify-center rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-[var(--color-logo-navy)] transition-colors hover:bg-white/90 sm:w-auto md:text-base"
        >
          Update this listing
        </Link>
      </div>
    </section>
  );
}
