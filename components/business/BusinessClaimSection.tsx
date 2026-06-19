import Link from "next/link";
import { ClaimListingForm } from "@/components/ClaimListingForm";
import { getAllFeatureFlags, isOnboardEnabled } from "@/lib/feature-flags";

type Props = {
  businessId: string;
  businessTitle: string;
  claimStatus: string;
  userId: string | null;
  claimedByUserId: string | null;
};

export async function BusinessClaimSection({
  businessId,
  businessTitle,
  claimStatus,
  userId,
  claimedByUserId,
}: Props) {
  const onboard = isOnboardEnabled(await getAllFeatureFlags());

  if (!onboard) {
    return (
      <section className="border-t border-zinc-100 pt-12">
        <ClaimListingForm
          businessId={businessId}
          claimStatus={claimStatus}
          userId={userId}
          claimedByUserId={claimedByUserId}
        />
      </section>
    );
  }

  const claimPath = `/portal/claim/${encodeURIComponent(businessId)}`;
  const href = userId ? claimPath : `/login?next=${encodeURIComponent(claimPath)}`;

  if (claimStatus === "claimed") {
    const yours = claimedByUserId === userId;
    return (
      <section className="border-t border-zinc-100 pt-12">
        <h2 className="text-sm font-semibold text-zinc-900">Listing owner</h2>
        <p className="mt-2 text-sm text-zinc-600">
          {yours
            ? "You manage this listing in your Business Portal."
            : "This listing has an approved owner on file."}
        </p>
        {yours ? (
          <Link
            href="/portal"
            className="mt-3 inline-block text-sm font-medium text-[var(--color-primary)] underline-offset-4 hover:underline"
          >
            Open Business Portal
          </Link>
        ) : null}
      </section>
    );
  }

  if (claimStatus === "pending_review") {
    return (
      <section className="border-t border-zinc-100 pt-12">
        <h2 className="text-sm font-semibold text-zinc-900">Claim in review</h2>
        <p className="mt-2 text-sm text-zinc-600">
          A claim is under review for {businessTitle}. We&apos;ll email you when it&apos;s decided.
        </p>
      </section>
    );
  }

  return (
    <section className="border-t border-zinc-100 pt-12">
      <h2 className="text-sm font-semibold text-zinc-900">Own this business?</h2>
      <p className="mt-2 text-sm text-zinc-600">
        Claim {businessTitle} to keep your hours, photos, and details up to date on WhereTo30A.
      </p>
      <Link
        href={href}
        className="mt-4 inline-flex rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
      >
        Claim this business
      </Link>
    </section>
  );
}
