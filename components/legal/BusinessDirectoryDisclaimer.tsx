import Link from "next/link";
import { normalizeUrlSegment } from "@/lib/routes/url-slug";
import { feedbackPageHref } from "@/lib/feedback/feedback-query";

type Props = {
  variant?: "card" | "plain" | "flag";
  businessSlug?: string;
  className?: string;
};

export function BusinessDirectoryDisclaimer({ variant = "card", businessSlug, className = "" }: Props) {
  const feedbackHref =
    businessSlug !== undefined && String(businessSlug).trim().length > 0
      ? feedbackPageHref(`/business/${normalizeUrlSegment(String(businessSlug).trim())}`)
      : "/feedback";

  const claimHref =
    businessSlug !== undefined ? `/business/${businessSlug}#listing-update-request` : null;

  const base = `text-xs text-[var(--color-text-tertiary)] ${className}`;
  const linkCn = "underline underline-offset-2 hover:text-[var(--color-primary)]";

  if (variant === "flag") {
    return (
      <p className={`flex items-center gap-1.5 ${base}`}>
        <span className="material-symbols-outlined !text-sm" aria-hidden>flag</span>
        <span>
          See something wrong?{" "}
          <Link href={feedbackHref} className={linkCn}>
            Send a correction
          </Link>
          {claimHref !== null && (
            <>
              {" "}or{" "}
              <Link href={claimHref} className={linkCn}>
                claim this listing
              </Link>
            </>
          )}
          {" · "}
          <Link href="/terms#directory-and-business-listings" className={linkCn}>
            Listing terms
          </Link>
        </span>
      </p>
    );
  }

  return (
    <p className={base}>
      Listings aren&apos;t verified—hours, descriptions, and suitability cues can be out of date.
      Appearance here isn&apos;t an endorsement unless we say so.{" "}
      <Link href={feedbackHref} className={linkCn}>
        Send a correction
      </Link>
      {claimHref !== null && (
        <>
          {" "}·{" "}
          <Link href={claimHref} className={linkCn}>
            Claim listing
          </Link>
        </>
      )}
      {" · "}
      <Link href="/terms#directory-and-business-listings" className={linkCn}>
        Terms&nbsp;§&nbsp;6–8
      </Link>
    </p>
  );
}
