import { Suspense } from "react";
import Link from "next/link";
import { SiteDocument } from "@/components/legal/SiteDocument";
import type { Metadata } from "next";
import { BusinessFeedbackForm } from "@/components/feedback/BusinessFeedbackForm";
import { FeedbackPrefillShell } from "@/components/feedback/FeedbackPrefillShell";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import { openGraphForPage } from "@/lib/seo/social-metadata";

const FEEDBACK_TITLE = "Listing feedback";
const FEEDBACK_DESCRIPTION =
  "Share feedback about a business listing on WhereTo30A: accuracy, experience, or suggested improvements.";

export const metadata: Metadata = {
  ...canonicalAlternates("/feedback"),
  title: FEEDBACK_TITLE,
  description: FEEDBACK_DESCRIPTION,
  robots: { index: false, follow: false },
  ...openGraphForPage({
    path: "/feedback",
    title: "Listing feedback | WhereTo30A",
    description: FEEDBACK_DESCRIPTION,
  }),
};

export default function FeedbackPage() {
  return (
    <SiteDocument
      title="Listing feedback"
      description='Tell us what went wrong or what needs updating.'
    >
      <p>
        We read every submission. If something on a listing doesn&apos;t match reality, describe it below and we&apos;ll route
        it to the team for review (we may follow up).
      </p>
      <h2>What to include</h2>
      <p>
        The more specific you are, the faster we can verify a change. Mention what you saw on the listing, what seems
        wrong or outdated, and when you visited or last checked if you can.
      </p>
      <ul>
        <li>Wrong or outdated hours, phone, website, or address</li>
        <li>A business that appears closed, moved, or listed twice</li>
        <li>A category or town that does not match where the business operates</li>
        <li>Photos or description copy that no longer reflects the current experience</li>
      </ul>
      <p>
        Business owners can use this form as well. If you represent the listing and need a broader update, you can also{" "}
        <Link href="/list-your-business">request a new or updated listing</Link>.
      </p>
      <p className="text-sm text-[var(--color-text-tertiary)]">
        Prefer email? Reach us directly at{" "}
        <a href="mailto:feedback@whereto30a.com">feedback@whereto30a.com</a>.
      </p>
      <p className="text-sm text-[var(--color-text-tertiary)]">
        Submitting feedback does not guarantee a particular edit timeline or outcome. How we handle corrections, and the legal limits on liability for directory copy, is described in{" "}
        <Link href="/terms#listing-information-scope" className="font-medium text-[var(--color-primary)] underline-offset-4 hover:underline">
          Terms&nbsp;§&nbsp;6.2
        </Link>{" "}
        and related sections.
      </p>
      <h2>Feedback form</h2>
      <Suspense fallback={<FeedbackPrefillShellFallback />}>
        <FeedbackPrefillShell />
      </Suspense>
    </SiteDocument>
  );
}

function FeedbackPrefillShellFallback() {
  return <BusinessFeedbackForm />;
}
