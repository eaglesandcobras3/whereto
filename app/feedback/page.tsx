import type { Metadata } from "next";
import Link from "next/link";
import { SiteDocument } from "@/components/legal/SiteDocument";
import { BusinessFeedbackForm } from "@/components/feedback/BusinessFeedbackForm";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import { openGraphForPage } from "@/lib/seo/social-metadata";
import { prefilledListingContextLine } from "@/lib/feedback/feedback-query";

const FEEDBACK_TITLE = "Listing feedback";
const FEEDBACK_DESCRIPTION =
  "Share feedback about a business listing on WhereTo30A — accuracy, experience, or suggested improvements.";

function feedbackHasPrefillParams(
  searchParams: Record<string, string | string[] | undefined>,
): boolean {
  return Object.keys(searchParams).some((key) => {
    const v = searchParams[key];
    if (typeof v === "string") return v.trim().length > 0;
    if (Array.isArray(v)) return v.some((part) => part.trim().length > 0);
    return false;
  });
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const hasPrefillParams = feedbackHasPrefillParams(sp);

  return {
    ...canonicalAlternates("/feedback"),
    title: FEEDBACK_TITLE,
    description: FEEDBACK_DESCRIPTION,
    // Bare /feedback is the indexable landing page; ?p= / ?title= variants are form prefill only.
    robots: hasPrefillParams ? { index: false, follow: true } : { index: true, follow: true },
    ...openGraphForPage({
      path: "/feedback",
      title: "Listing feedback | WhereTo30A",
      description: FEEDBACK_DESCRIPTION,
    }),
  };
}

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const prefilled = prefilledListingContextLine(sp);

  return (
    <SiteDocument
      title="Listing feedback"
      description='Tell us what went wrong or what needs updating.'
    >
      {prefilled ? (
        <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
          To save you typing, we&apos;ll start the &quot;listing link&quot; field with{' '}
          <span className="text-[var(--color-text-primary)]">{prefilled}</span>. Feel free to edit it before you send.
        </p>
      ) : null}
      <p>
        We read every submission. If something on a listing doesn&apos;t match reality, describe it below and we&apos;ll route
        it to the team for review (we may follow up).
      </p>
      <p className="text-sm text-[var(--color-text-tertiary)]">
        Prefer email? Reach us directly at{" "}
        <a href="mailto:feedback@whereto30a.com">feedback@whereto30a.com</a>.
      </p>
      <p className="text-sm text-[var(--color-text-tertiary)]">
        Submitting feedback does not guarantee a particular edit timeline or outcome. How we handle corrections—and the legal limits on liability for directory copy—is described in{" "}
        <Link href="/terms#listing-information-scope" className="font-medium text-[var(--color-primary)] underline-offset-4 hover:underline">
          Terms&nbsp;§&nbsp;6.2
        </Link>{" "}
        and related sections.
      </p>
      <h2>Feedback form</h2>
      <BusinessFeedbackForm initialListingContext={prefilled} />
    </SiteDocument>
  );
}
