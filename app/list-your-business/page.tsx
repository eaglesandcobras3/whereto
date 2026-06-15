import type { Metadata } from "next";
import Link from "next/link";
import { SiteDocument } from "@/components/legal/SiteDocument";
import { ListBusinessForm, type ListBusinessTownOption } from "@/components/listing-request/ListBusinessForm";
import { BROWSE_VISIBLE_NOT_HIDDEN, DIRECTUS_PUBLISHED_STATUS } from "@/lib/shop/public-listing-filters";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import { openGraphForPage } from "@/lib/seo/social-metadata";

export const metadata: Metadata = {
  ...canonicalAlternates("/list-your-business"),
  title: "List your business",
  description:
    "Request to add your Emerald Coast business or service to WhereTo30A. Submissions are reviewed before publication.",
  robots: { index: true, follow: true },
  ...openGraphForPage({
    path: "/list-your-business",
    title: "List your business | WhereTo30A",
    description:
      "Request to add your Emerald Coast business or service to WhereTo30A. Submissions are reviewed before publication.",
  }),
};

async function loadTowns(): Promise<ListBusinessTownOption[]> {
  try {
    const supabase = getServiceSupabase();
    const townsRes = await supabase
      .from("towns")
      .select("id, title, slug")
      .is("archived_at", null)
      .eq("status", DIRECTUS_PUBLISHED_STATUS)
      .or(BROWSE_VISIBLE_NOT_HIDDEN)
      .order("title");
    if (townsRes.error) {
      console.error("list-your-business towns", townsRes.error);
    }
    return (townsRes.data ?? []).map((t) => ({
      id: t.id as string,
      title: (t as { title: string }).title,
      slug: t.slug as string,
    }));
  } catch {
    return [];
  }
}

export default async function ListYourBusinessPage() {
  const towns = await loadTowns();

  return (
    <SiteDocument
      title="List your business"
      description="Submit a request to add or update a local listing. We review every submission before it appears on the site."
    >
      <p className="text-sm text-[var(--color-text-secondary)]">
        By submitting you represent you are authorized to request the listing and that operational facts you supply are accurate to the best of your knowledge—see representation and indemnity language in{" "}
        <Link href="/terms#directory-and-business-listings" className="font-medium text-[var(--color-primary)] underline-offset-4 hover:underline">
          Terms&nbsp;§&nbsp;5–8
        </Link>
        .
      </p>
      {towns.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)]">
          Town directory is temporarily unavailable. Please try again later or email{" "}
          <a
            className="font-medium text-[var(--color-logo-navy)] underline-offset-2 hover:underline"
            href="mailto:hello@whereto30a.com"
          >
            hello@whereto30a.com
          </a>
          .
        </p>
      ) : (
        <ListBusinessForm towns={towns} />
      )}
    </SiteDocument>
  );
}
