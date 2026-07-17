import Link from "next/link";
import type { Metadata } from "next";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import { openGraphForPage } from "@/lib/seo/social-metadata";
import { BrowseHubHero } from "@/components/browse/BrowseHubHero";
import { CategoryHubSections } from "@/components/browse/CategoryHubSections";
import { countCategoryHubBusinesses, getCategoryHubSections } from "@/lib/data/category-hub";

export const revalidate = 21600;

export const metadata: Metadata = {
  ...canonicalAlternates("/categories"),
  title: "Browse by Category | Restaurants, Coffee, Bars & More on 30A",
  description:
    "Find the best restaurants, coffee shops, bars, activities, shopping, and service businesses along Scenic 30A in South Walton, Florida. Browse every category of local business.",
  keywords: [
    "30A restaurants",
    "30A coffee shops",
    "30A bars",
    "things to do 30A",
    "30A shopping",
    "30A activities",
    "South Walton businesses",
    "Emerald Coast dining",
  ],
  ...openGraphForPage({
    path: "/categories",
    title: "Browse by Category | 30A Local Businesses | WhereTo30A",
    description:
      "Every category of local business along 30A: restaurants, coffee, bars, activities, shopping, and service businesses.",
  }),
};

export default async function CategoriesPage() {
  const [sections, totalCount] = await Promise.all([
    getCategoryHubSections("all"),
    countCategoryHubBusinesses("all"),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <main className="flex-1">
        <BrowseHubHero
          title="Browse by category"
          description="Every category of local business along Scenic 30A — storefronts and service providers together."
          collapsibleDescription="Expand a group to browse listings. Prefer shops and restaurants only? See Businesses. Prefer trades and appointment-based vendors? See Services."
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
            analyticsCategoryPrefix="categories_hub"
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
              Looking for something specific?
            </h2>
            <p className="mt-3 text-[var(--color-text-secondary)]">
              Use search to find businesses by name, vibe, or natural language. &quot;Casual
              dinner after the beach&quot; works.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-7 py-3.5 text-sm font-bold text-white transition-all hover:opacity-90"
            >
              <span className="material-symbols-outlined !text-base">search</span>
              Search 30A
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
