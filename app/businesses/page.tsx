import Link from "next/link";
import type { Metadata } from "next";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import { openGraphForPage } from "@/lib/seo/social-metadata";
import { CategoryHubSections } from "@/components/browse/CategoryHubSections";
import { countCategoryHubBusinesses, getCategoryHubSections } from "@/lib/data/category-hub";
import { hubBusinessesIntro } from "@/lib/seo/page-intro-copy";
import { CollapsibleText } from "@/components/ui/collapsible-text";

export const revalidate = 21600;

export const metadata: Metadata = {
  ...canonicalAlternates("/businesses"),
  title: "Local Businesses on 30A, Florida | Restaurants, Shops & More",
  description:
    "Browse local businesses along Scenic 30A in South Walton, Florida: restaurants, coffee shops, bars, activities, shopping boutiques, and services across Rosemary Beach, Seaside, WaterColor, Alys Beach, and Inlet Beach.",
  keywords: [
    "30A local businesses",
    "30A restaurants",
    "30A shops",
    "South Walton businesses",
    "Emerald Coast local",
    "30A Florida directory",
    "things to do 30A",
    "where to eat 30A",
  ],
  ...openGraphForPage({
    path: "/businesses",
    title: "Local Businesses on 30A, Florida | WhereTo30A",
    description:
      "The local business directory for Scenic 30A: restaurants, coffee, bars, activities, shopping, and services curated town by town.",
  }),
};

export default async function BusinessesPage() {
  const [sections, totalCount] = await Promise.all([
    getCategoryHubSections(),
    countCategoryHubBusinesses(),
  ]);

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <div className="coastal-hero border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14 md:px-10">
          <header className="max-w-3xl space-y-3">
            <p className="text-eyebrow">30A · South Walton, Florida</p>
            <h1 className="font-headline text-2xl font-extrabold tracking-tight text-[var(--color-text-primary)] sm:text-3xl md:text-4xl">
              Local businesses on 30A
            </h1>
            <p className="text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-[0.9375rem]">
              Restaurants, coffee shops, bars, boutiques, and more across every community along
              Scenic 30A. Browse by category below.
            </p>
            {totalCount > 0 ? (
              <p className="text-sm text-[var(--color-text-tertiary)]">
                {totalCount} {totalCount === 1 ? "listing" : "listings"}
                {sections.length > 0
                  ? ` across ${sections.length} browse ${sections.length === 1 ? "group" : "groups"}`
                  : ""}
              </p>
            ) : null}
            <CollapsibleText
              text={hubBusinessesIntro()}
              className="text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-[0.9375rem]"
            />
          </header>
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-4 py-12 md:px-10">
        <CategoryHubSections
          sections={sections}
          analyticsCategoryPrefix="businesses_hub"
          subheading="Tap a group to expand and browse listings."
          emptyMessage={
            <p className="text-[var(--color-text-secondary)]">
              No listings yet.{" "}
              <Link href="/list-your-business" className="text-[var(--color-primary)] hover:underline">
                List your business
              </Link>
              .
            </p>
          }
        />
      </section>
    </div>
  );
}
