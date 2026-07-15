import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { SiteDocument } from "@/components/legal/SiteDocument";
import { ListYourBusinessClient } from "@/components/listing-request/ListYourBusinessClient";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import { openGraphForPage } from "@/lib/seo/social-metadata";

export const revalidate = 21600;

type PageProps = {
  searchParams: Promise<{ business?: string }>;
};

function isUpdateRequest(searchParams: { business?: string }): boolean {
  return Boolean(searchParams.business?.trim());
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sp = await searchParams;
  const isUpdate = isUpdateRequest(sp);
  const title = isUpdate ? "Update a business" : "List your business";
  const description = isUpdate
    ? "Suggest updates for your Emerald Coast listing on WhereTo30A. Submissions are reviewed before publication."
    : "Request to add your Emerald Coast business or service to WhereTo30A. Submissions are reviewed before publication.";

  return {
    ...canonicalAlternates("/list-your-business"),
    title,
    description,
    robots: { index: false, follow: false },
    ...openGraphForPage({
      path: "/list-your-business",
      title: `${title} | WhereTo30A`,
      description,
    }),
  };
}

export default async function ListYourBusinessPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const isUpdate = isUpdateRequest(sp);
  const title = isUpdate ? "Update a business" : "List your business";

  return (
    <SiteDocument
      title={title}
      description="Submit a request to add or update a local listing. We review every submission before it appears on the site."
      afterDescription={
        !isUpdate ? (
          <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
            Looking to update an existing business? Go to your business page and click Update this
            Listing.
          </p>
        ) : null
      }
      contentClassName="mt-6"
    >
      <p className="not-prose text-sm text-[var(--color-text-secondary)]">
        By submitting you represent you are authorized to request the listing and that operational
        facts you supply are accurate to the best of your knowledge. See representation and
        indemnity language in{" "}
        <Link
          href="/terms#directory-and-business-listings"
          className="font-medium text-[var(--color-primary)] underline-offset-4 hover:underline"
        >
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
