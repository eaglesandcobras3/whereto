"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { captureEvent } from "@/lib/analytics/gtag-runner";
import { staysBookingGoPath } from "@/lib/stays/constants";

type Props = {
  propertyId: string;
  businessId: string;
  className?: string;
};

export function RentalBookingCta({ propertyId, businessId, className }: Props) {
  const searchParams = useSearchParams();
  const checkIn = searchParams.get("check_in");
  const checkOut = searchParams.get("check_out");
  const guestsRaw = searchParams.get("guests");
  const guests = guestsRaw ? Number(guestsRaw) : null;
  const guestsOk = guests != null && Number.isFinite(guests) && guests > 0 ? guests : null;

  useEffect(() => {
    captureEvent("rental_property_viewed", {
      property_id: propertyId,
      business_id: businessId,
    });
  }, [propertyId, businessId]);

  const sp = new URLSearchParams();
  if (checkIn) sp.set("check_in", checkIn);
  if (checkOut) sp.set("check_out", checkOut);
  if (guestsOk) sp.set("guests", String(guestsOk));
  const href = `${staysBookingGoPath(propertyId)}${sp.toString() ? `?${sp}` : ""}`;

  return (
    <div className={className}>
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-full items-center justify-center bg-teal-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-900"
        onClick={() => {
          captureEvent("rental_booking_click", {
            property_id: propertyId,
            business_id: businessId,
            has_dates: Boolean(checkIn && checkOut),
            guests: guestsOk ?? undefined,
            source: "property_detail",
          });
        }}
      >
        Check availability
      </Link>
      <p className="mt-2 text-xs leading-relaxed text-zinc-500">
        You&apos;ll continue on the property manager&apos;s booking site. WhereTo30A does not process
        payments or reservations.
      </p>
    </div>
  );
}
