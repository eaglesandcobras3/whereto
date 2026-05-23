import Link from "next/link";
import { normalizeUrlSegment } from "@/lib/routes/url-slug";
import { feedbackPageHref } from "@/lib/feedback/feedback-query";

const linkCn =
  "font-medium text-[var(--color-primary)] underline-offset-2 hover:underline";

type Props = {
  variant?: "card" | "plain";
  businessSlug?: string;
  className?: string;
};

/**
 * Sidebar cue—the binding disclaimers live in `/terms`.
 */
export function BusinessDirectoryDisclaimer({ variant = "card", businessSlug, className = "" }: Props) {
  const claimHref =
    businessSlug !== undefined ? `/business/${businessSlug}#listing-update-request` : null;

  const feedbackHref =
    businessSlug !== undefined && String(businessSlug).trim().length > 0
      ? feedbackPageHref(`/business/${normalizeUrlSegment(String(businessSlug).trim())}`)
      : "/feedback";

  const body = (
    <>
      Listing information is informational—not verified truth. Descriptions,
      suitability cues, heuristic scores, photos, excerpts, imports, licensee feeds—and tooling-assisted narratives—often move faster than
      we can reconcile. Appearance here is typically not an endorsement, inspection
      certification, ADA or allergen guarantee, minors or alcohol-compliance guarantee, audited licensing statement—or other professional suitability
      claim—unless contiguous text plainly marks paid amplification or plainly attributes authoritative third-party data.

      <span className="mt-3 block">
        We invite corrections through{" "}
        <Link href={feedbackHref} className={linkCn}>
          /feedback
        </Link>
        {claimHref !== null ? (
          <>
            {" "}
            and the{" "}
            <Link href={claimHref} className={linkCn}>
              claim or correct section
            </Link>
          </>
        ) : null}
        . We review credible reports with commercially reasonable diligence where practicable—without promising specific timelines wording or continued publication. Warranty disclaimers indemnities and liability caps that apply to business portrayals are in{" "}
        <Link href="/terms#directory-and-business-listings" className={linkCn}>
          Terms&nbsp;§&nbsp;6–8
        </Link>
        {" (effective May\u00a021\u00a02026)."}
      </span>
    </>
  );

  if (variant === "plain") {
    return <p className={`text-[11px] leading-relaxed text-zinc-500 ${className}`}>{body}</p>;
  }

  return (
    <section
      aria-label="Listing information disclaimer"
      className={`rounded-2xl border border-zinc-200/90 bg-zinc-50/80 p-4 text-[11px] leading-relaxed text-zinc-600 ${className}`}
    >
      {body}
    </section>
  );
}
