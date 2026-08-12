"use client";

import Link from "next/link";
import { RentalCard } from "@/components/stays/RentalCard";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import { STAYS_HUB_PATH } from "@/lib/stays/constants";
import type { RentalPropertyView } from "@/lib/stays/types";

type Props = {
  rentals: RentalPropertyView[];
};

export function FeaturedRentalsSection({ rentals }: Props) {
  if (rentals.length === 0) return null;

  return (
    <section id="section-featured-stays" className="bg-background py-20 md:py-28">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-6 lg:px-8">
        <div className="mb-12 md:mb-16">
          <p className="text-eyebrow mb-3">WhereTo30A Stays</p>
          <h2 className="text-editorial-headline text-4xl text-primary sm:text-5xl">
            Featured stays
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--color-text-secondary)] md:text-lg">
            Vacation rentals from trusted local managers — discover here, book on their site.
          </p>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {rentals.map((p, i) => (
            <RentalCard key={p.id} property={p} position={i + 1} />
          ))}
        </div>
        <div className="mt-10 flex justify-center md:mt-12">
          <Link
            href={STAYS_HUB_PATH}
            {...gaClickProps({
              event: "nav_click",
              category: "home_featured_stays",
              label: "view_more_stays",
            })}
            className="group inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-8 py-3.5 text-base font-semibold text-[var(--color-primary)] shadow-sm transition-all hover:border-[var(--color-primary)] hover:shadow-md"
          >
            View more stays
            <span
              className="material-symbols-outlined !text-lg transition-transform group-hover:translate-x-1"
              aria-hidden
            >
              arrow_forward
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
