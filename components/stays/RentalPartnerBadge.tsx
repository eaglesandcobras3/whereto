import Link from "next/link";
import { VerifiedBadge } from "@/components/business/VerifiedBadge";
import { gaClickProps } from "@/lib/analytics/ga-click-props";

type Props = {
  businessSlug: string | null;
  businessTitle: string | null;
  partnerDisplayName?: string | null;
  showPublicBusiness?: boolean | null;
  isVerified?: boolean | null;
  partnerActive?: boolean;
};

/** Shows rental-partner mark; company link only when a public business profile is opted in. */
export function RentalPartnerBadge({
  businessSlug,
  businessTitle,
  partnerDisplayName,
  showPublicBusiness,
  isVerified,
  partnerActive,
}: Props) {
  const showCompany =
    showPublicBusiness === true && Boolean(businessSlug && businessTitle);

  if (!partnerActive && !showCompany && !partnerDisplayName) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {partnerActive ? (
        <span className="inline-flex items-center border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-900">
          Rental partner
        </span>
      ) : null}
      {showCompany && isVerified ? <VerifiedBadge /> : null}
      {showCompany ? (
        <Link
          href={`/business/${encodeURIComponent(businessSlug!)}`}
          className="text-sm font-medium text-teal-900 underline-offset-2 hover:underline"
          {...gaClickProps({
            event: "rental_manager_viewed",
            category: "stays_detail",
            label: businessSlug!,
          })}
        >
          Managed by {businessTitle}
        </Link>
      ) : null}
    </div>
  );
}
