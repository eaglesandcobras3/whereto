import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { SiteDocument } from "@/components/legal/SiteDocument";
import { ListYourBusinessClient } from "@/components/listing-request/ListYourBusinessClient";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import { openGraphForPage } from "@/lib/seo/social-metadata";

export const revalidate = 21600;

export const metadata: Metadata = {
  ...canonicalAlternates("/list-your-business"),
  title: "List your business",
  description:
    "Request to add your Emerald Coast business or service to WhereTo30A. Submissions are reviewed before publication.",
  robots: { index: false, follow: false },
  ...openGraphForPage({
    path: "/list-your-business",
    title: "List your business | WhereTo30A",
    description:
      "Request to add your Emerald Coast business or service to WhereTo30A. Submissions are reviewed before publication.",
  }),
};

export default function ListYourBusinessPage() {
  return (
    <SiteDocument
      title="List your business"
      description="Submit a request to add or update a local listing. We review every submission before it appears on the site."
    >
      <p className="text-sm text-[var(--color-text-secondary)]">
        By submitting you represent you are authorized to request the listing and that operational facts you supply are accurate to the best of your knowledge. See representation and indemnity language in{" "}
        <Link href="/terms#directory-and-business-listings" className="font-medium text-[var(--color-primary)] underline-offset-4 hover:underline">
          Terms&nbsp;§&nbsp;5–8
        </Link>
        .
      </p>
      <Suspense fallback={<p className="text-sm text-[var(--color-text-secondary)]">Loading form…</p>}>
        <ListYourBusinessClient />
      </Suspense>
    </SiteDocument>
  );
}
