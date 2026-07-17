import Link from "next/link";
import type { Metadata } from "next";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import { openGraphForPage } from "@/lib/seo/social-metadata";
import { BrowseHubHero } from "@/components/browse/BrowseHubHero";
import { CategoryHubSections } from "@/components/browse/CategoryHubSections";
import { countCategoryHubBusinesses, getCategoryHubSections } from "@/lib/data/category-hub";

export const revalidate = 21600;

export const metadata: Metadata = {
  ...canonicalAlternates("/businesses"),
  title: "Businesses on 30A | Shops, Restaurants, Services & More",
  description:
    "Browse local businesses along Scenic 30A — restaurants, shops, lodging, trades, and appointment-based providers — by category.",
  ...openGraphForPage({
    path: "/businesses",
    title: "Businesses on 30A | WhereTo30A",
    description:
      "Local businesses along 30A: places to visit and providers to hire, browsed by category.",
  }),
};

/** Combined hub: storefronts and service providers together. */
export default async function BusinessesHubPage() {
  const [sections, totalCount] = await Promise.all([
    getCategoryHubSections("all"),
    countCategoryHubBusinesses("all"),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <main className="flex-1">
        <BrowseHubHero
          title="Businesses"
          description="Local businesses along Scenic 30A — restaurants, shops, lodging, trades, and providers you book by appointment."
          collapsibleDescription="One directory for places you can visit and businesses that come to you. Expand a group to browse listings, or open Categories for the full taxonomy."
          meta={
            <>
              {totalCount} {totalCount === 1 ? "listing" : "listings"}
              {sections.length > 0
                ? ` in ${sections.length} browse ${sections.length === 1 ? "group" : "groups"}`
                : ""}
            </>
          }
        />

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

        <section className="border-t border-[var(--color-border)] bg-[var(--color-surface-container-low)] py-14">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="font-headline text-2xl font-bold text-[var(--color-text-primary)]">
              Prefer browsing by category name?
            </h2>
            <p className="mt-3 text-[var(--color-text-secondary)]">
              The categories hub lists every rollup and leaf the same way.
            </p>
            <Link
              href="/categories"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-7 py-3.5 text-sm font-bold text-white transition-all hover:opacity-90"
            >
              All categories
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
