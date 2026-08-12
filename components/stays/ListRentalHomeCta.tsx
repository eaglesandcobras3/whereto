"use client";

import Link from "next/link";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import { PAGE_SECTION_CONTAINER_CLASS } from "@/lib/layout/page-section";

/** Stays hub CTA — same role as ListBusinessHomeCta on /businesses. */
export function ListRentalHomeCta() {
  return (
    <section
      id="section-list-your-rentals"
      aria-labelledby="stays-list-rental-heading"
      className="relative py-16 md:py-24"
    >
      <div className={PAGE_SECTION_CONTAINER_CLASS}>
        <div className="overflow-hidden rounded-2xl bg-[var(--color-logo-navy)]">
          <div className="p-8 md:p-12 lg:p-14">
            <p className="text-eyebrow mb-3 !text-white">For property managers</p>
            <h2
              id="stays-list-rental-heading"
              className="max-w-3xl font-headline text-3xl font-bold leading-tight tracking-tight text-white md:text-4xl"
            >
              List a vacation rental on WhereTo30A
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/75 md:text-lg">
              Submit your stay for review. Guests discover it here, then check availability on your
              booking site — you keep the reservation.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/list-your-rentals"
                className="inline-flex w-full items-center justify-center rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-[var(--color-logo-navy)] transition-colors hover:bg-white/90 sm:w-auto md:text-base"
                {...gaClickProps({
                  event: "cta_click",
                  category: "stays_hub",
                  label: "list_your_rentals",
                })}
              >
                List a vacation rental
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
