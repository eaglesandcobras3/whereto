import type { Metadata } from "next";
import { SiteDocument } from "@/components/legal/SiteDocument";
import {
  ListBusinessForm,
  type ListBusinessCategoryOption,
  type ListBusinessTownOption,
} from "@/components/listing-request/ListBusinessForm";
import { BROWSE_VISIBLE_NOT_HIDDEN } from "@/lib/shop/public-listing-filters";
import { getServiceSupabase } from "@/lib/supabase/service-role";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";

export const metadata: Metadata = {
  ...canonicalAlternates("/list-your-business"),
  title: "List your business",
  description:
    "Request to add your Emerald Coast business or service to WhereTo30A. Submissions are reviewed before publication.",
  robots: { index: true, follow: true },
};

async function loadOptions(): Promise<{
  towns: ListBusinessTownOption[];
  categories: ListBusinessCategoryOption[];
}> {
  try {
    const supabase = getServiceSupabase();
    const [townsRes, catsRes] = await Promise.all([
      supabase
        .from("towns")
        .select("id, title, slug")
        .is("archived_at", null)
        .or(BROWSE_VISIBLE_NOT_HIDDEN)
        .order("title"),
      supabase
        .from("business_categories")
        .select("id, title, slug")
        .is("archived_at", null)
        .or(BROWSE_VISIBLE_NOT_HIDDEN)
        .order("title"),
    ]);
    if (townsRes.error) {
      // eslint-disable-next-line no-console
      console.error("list-your-business towns", townsRes.error);
    }
    if (catsRes.error) {
      // eslint-disable-next-line no-console
      console.error("list-your-business categories", catsRes.error);
    }
    const towns = (townsRes.data ?? []).map((t) => ({
      id: t.id as string,
      title: (t as { title: string }).title,
      slug: t.slug as string,
    }));
    const categories = (catsRes.data ?? []).map((c) => ({
      id: c.id as string,
      title: (c as { title: string }).title,
      slug: c.slug as string,
    }));
    return { towns, categories };
  } catch {
    return { towns: [], categories: [] };
  }
}

export default async function ListYourBusinessPage() {
  const { towns, categories } = await loadOptions();

  return (
    <SiteDocument
      title="List your business"
      description="Submit a request to add or update a local listing. We review every submission before it appears on the site."
    >
      {towns.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)]">
          Town directory is temporarily unavailable. Please try again later or email{" "}
          <a className="font-medium text-[var(--color-logo-navy)] underline-offset-2 hover:underline" href="mailto:hello@whereto30a.com">
            hello@whereto30a.com
          </a>
          .
        </p>
      ) : (
        <ListBusinessForm towns={towns} categories={categories} />
      )}
    </SiteDocument>
  );
}
