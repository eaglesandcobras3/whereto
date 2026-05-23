import type { Metadata } from "next";
import Link from "next/link";
import { SiteDocument } from "@/components/legal/SiteDocument";
import { BusinessFeedbackForm } from "@/components/feedback/BusinessFeedbackForm";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";

export const metadata: Metadata = {
  ...canonicalAlternates("/feedback"),
  title: "Listing feedback",
  description:
    "Share feedback about a business listing on WhereTo30A — accuracy, experience, or suggested improvements.",
  robots: { index: true, follow: true },
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
      <BusinessFeedbackForm />
    </SiteDocument>
  );
}
