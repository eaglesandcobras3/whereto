import Link from "next/link";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import { LIST_YOUR_RENTALS_PATH } from "@/lib/stays/constants";

type Props = {
  /** Primary path — today always new listing submission (no update-by-slug flow yet). */
  updateListingHref?: string;
  addRentalHref?: string;
  analyticsLabel?: string;
  className?: string;
};

/**
 * Bottom-of-page CTA for rental owners — mirrors BusinessUpdateListingCta.
 */
export function StayUpdateListingCta({
  updateListingHref = LIST_YOUR_RENTALS_PATH,
  addRentalHref = LIST_YOUR_RENTALS_PATH,
  analyticsLabel,
  className = "",
}: Props) {
  const analyticsBase = analyticsLabel ?? "stay_listing_cta";

  return (
    <section
      aria-labelledby="stay-update-listing-heading"
      className={`rounded-2xl bg-[var(--color-logo-navy)] px-6 py-8 sm:px-8 sm:py-9 md:px-10 ${className}`}
    >
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-10">
        <div className="min-w-0 max-w-2xl">
          <h2
            id="stay-update-listing-heading"
            className="font-headline text-xl font-bold tracking-tight text-white sm:text-2xl"
          >
            Own or manage this rental?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/75 sm:text-base">
            Submit this stay (or an update) for review so guests find you on WhereTo30A — then book
            on your site. Have another property? Add that listing too.
          </p>
        </div>
        <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Link
            href={updateListingHref}
            {...gaClickProps({
              event: "cta_click",
              category: "stay_detail",
              label: `${analyticsBase}_update`,
            })}
            className="inline-flex w-full items-center justify-center rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-[var(--color-logo-navy)] transition-colors hover:bg-white/90 sm:w-auto md:text-base"
          >
            List or update this stay
          </Link>
          <Link
            href={addRentalHref}
            {...gaClickProps({
              event: "cta_click",
              category: "stay_detail",
              label: `${analyticsBase}_add_new`,
            })}
            className="inline-flex w-full items-center justify-center rounded-xl border border-white/35 bg-transparent px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:border-white/60 hover:bg-white/10 sm:w-auto md:text-base"
          >
            Add a new rental
          </Link>
        </div>
      </div>
    </section>
  );
}
