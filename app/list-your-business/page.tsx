import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { SiteDocument } from "@/components/legal/SiteDocument";
import { ListYourBusinessClient } from "@/components/listing-request/ListYourBusinessClient";
import {
  resolveListBusinessMode,
  type ListBusinessMode,
} from "@/lib/listing-requests/list-business-mode";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import { openGraphForPage } from "@/lib/seo/social-metadata";

export const revalidate = 21600;

type PageProps = {
  searchParams: Promise<{ business?: string; new?: string }>;
};

function copyForMode(mode: ListBusinessMode): { title: string; description: string } {
  if (mode === "slug") {
    return {
      title: "Update a business",
      description:
        "Suggest updates for your Emerald Coast listing on WhereTo30A. Submissions are reviewed before publication.",
    };
  }
  if (mode === "new") {
    return {
      title: "List your business",
      description:
        "Request to add your Emerald Coast business or service to WhereTo30A. Submissions are reviewed before publication.",
    };
  }
  return {
    title: "Verify a business",
    description:
      "Find your existing WhereTo30A listing to verify or update it. Submissions are reviewed before publication.",
  };
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sp = await searchParams;
  const mode = resolveListBusinessMode({ business: sp.business, new: sp.new });
  const { title, description } = copyForMode(mode);

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
  const mode = resolveListBusinessMode({ business: sp.business, new: sp.new });
  const { title } = copyForMode(mode);

  return (
    <SiteDocument
      title={title}
      description="Submit a request to add or update a local listing. We review every submission before it appears on the site."
      afterDescription={
        mode === "find" ? (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)]">
            <span className="material-symbols-outlined !text-sm" aria-hidden>
              search
            </span>
            <span>
              Start typing your business name to find an existing listing. Not listed yet?{" "}
              <Link
                href="/list-your-business?new=1"
                className="underline underline-offset-2 hover:text-[var(--color-primary)]"
              >
                Add a new business
              </Link>
              .
            </span>
          </p>
        ) : mode === "new" ? (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)]">
            <span className="material-symbols-outlined !text-sm" aria-hidden>
              verified
            </span>
            <span>
              Already on WhereTo30A?{" "}
              <Link
                href="/list-your-business"
                className="underline underline-offset-2 hover:text-[var(--color-primary)]"
              >
                Verify your existing listing
              </Link>
              .
            </span>
          </p>
        ) : null
      }
      contentClassName="mt-6"
    >
      <Suspense fallback={<p className="text-sm text-[var(--color-text-secondary)]">Loading form…</p>}>
        <ListYourBusinessClient />
      </Suspense>
      <p className="not-prose mt-10 text-xs leading-relaxed text-[var(--color-text-tertiary)]">
        By submitting you represent you are authorized to request the listing and that operational
        facts you supply are accurate to the best of your knowledge.{" "}
        <Link
          href="/terms#directory-and-business-listings"
          className="underline underline-offset-2 hover:text-[var(--color-primary)]"
        >
          Terms&nbsp;§&nbsp;5–8
        </Link>
        .
      </p>
    </SiteDocument>
  );
}
