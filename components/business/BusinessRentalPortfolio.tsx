import Link from "next/link";
import { RentalCard } from "@/components/stays/RentalCard";
import { gaClickProps } from "@/lib/analytics/ga-click-props";
import type { RentalPropertyView } from "@/lib/stays/types";

type Props = {
  properties: RentalPropertyView[];
  partnerStatus: string | null;
  isVerified?: boolean | null;
};

export function BusinessRentalPortfolio({ properties, partnerStatus, isVerified }: Props) {
  if (!properties.length && partnerStatus !== "active") return null;

  return (
    <section className="mt-10 border-t border-zinc-200 pt-8">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-headline text-xl font-semibold text-zinc-900">Vacation rentals</h2>
        {partnerStatus === "active" ? (
          <span className="border border-teal-200 bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-900">
            Rental partner
          </span>
        ) : null}
        {isVerified ? (
          <span className="text-xs font-medium text-emerald-800">Owner verified</span>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-zinc-600">
        {properties.length} active propert{properties.length === 1 ? "y" : "ies"} · Book directly with
        this local manager
      </p>
      {properties.length > 0 ? (
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {properties.map((p, i) => (
            <RentalCard key={p.id} property={p} position={i + 1} />
          ))}
        </div>
      ) : null}
      <p className="mt-4 text-sm">
        <Link
          href="/stays"
          className="font-medium text-teal-900 underline"
          {...gaClickProps({
            event: "cta_click",
            category: "business_rental_portfolio",
            label: "browse_stays",
          })}
        >
          Browse all 30A stays
        </Link>
      </p>
    </section>
  );
}
