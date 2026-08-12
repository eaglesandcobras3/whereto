"use client";

import Link from "next/link";
import { isRentalsEnabled } from "@/lib/feature-flags-core";
import { useAppFeatureFlags } from "@/lib/feature-flags-client";
import { isRentalPartnersFeatureEnabledClient } from "@/lib/feature-flags-client-utils";
import { PAGE_SECTION_CONTAINER_CLASS } from "@/lib/layout/page-section";
import { LIST_YOUR_RENTALS_PATH } from "@/lib/stays/constants";

/**
 * Hub / homepage-style CTA for property managers — mirrors ListBusinessHomeCta.
 */
export function ListRentalsHomeCta() {
  const flags = useAppFeatureFlags();
  const rentalsOn = isRentalsEnabled(flags);
  const partnersOn = isRentalPartnersFeatureEnabledClient(flags);
  if (!rentalsOn && !partnersOn) return null;

  return (
    <section
      id="section-list-your-rentals"
      aria-labelledby="home-list-rentals-heading"
      className="relative py-16 md:py-24"
    >
      <div className={PAGE_SECTION_CONTAINER_CLASS}>
        <div className="overflow-hidden rounded-2xl bg-[var(--color-logo-navy)]">
          <div className="p-8 md:p-12 lg:p-14">
            <p className="text-eyebrow mb-3 !text-white">For property managers</p>
            <h2
              id="home-list-rentals-heading"
              className="max-w-3xl font-headline text-3xl font-bold leading-tight tracking-tight text-white md:text-4xl"
            >
              {rentalsOn
                ? "List your vacation rental on WhereTo30A"
                : "Partner with WhereTo30A"}
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/75 md:text-lg">
              {rentalsOn
                ? "Guests discover your stay here, then check availability on your booking site — you keep reservations, payments, and guest support."
                : "Apply as a rental partner to bring your inventory onto WhereTo30A when listings open."}
            </p>
            {rentalsOn ? (
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/55">
                We review every submission before it goes live, with the same standards as the rest of
                the guide.
              </p>
            ) : null}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {rentalsOn ? (
                <Link
                  href={LIST_YOUR_RENTALS_PATH}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-[var(--color-logo-navy)] transition-colors hover:bg-white/90 sm:w-auto md:text-base"
                >
                  <span className="material-symbols-outlined !text-xl" aria-hidden>
                    holiday_village
                  </span>
                  List a vacation rental
                </Link>
              ) : null}
              {partnersOn ? (
                <Link
                  href={`${LIST_YOUR_RENTALS_PATH}/partner`}
                  className={
                    rentalsOn
                      ? "inline-flex w-full items-center justify-center rounded-xl border border-white/35 bg-transparent px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:border-white/60 hover:bg-white/10 sm:w-auto md:text-base"
                      : "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-[var(--color-logo-navy)] transition-colors hover:bg-white/90 sm:w-auto md:text-base"
                  }
                >
                  Partner application
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
