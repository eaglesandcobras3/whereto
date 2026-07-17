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
  title: "Businesses on 30A | Shops, Restaurants & Places to Visit",
  description:
    "Browse storefront businesses along Scenic 30A — restaurants, shops, coffee, lodging, and more. For mobile and appointment-based providers, see Services.",
  ...openGraphForPage({
    path: "/businesses",
    title: "Businesses on 30A | WhereTo30A",
    description:
      "Storefront places and shops along 30A — restaurants, coffee, shopping, lodging, and more.",
  }),
};

/** Stores-only hub (`is_storefront`). Categories hub shows storefronts and services together. */
export default async function BusinessesHubPage() {
  const [sections, totalCount] = await Promise.all([
    getCategoryHubSections("storefront"),
    countCategoryHubBusinesses("storefront"),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <main className="flex-1">
        <BrowseHubHero
          title="Businesses"
          description="Places you can visit along Scenic 30A — restaurants, shops, coffee, lodging, and more."
          collapsibleDescription="Storefront listings only. Browse all categories (including service providers) on Categories, or mobile and appointment-based vendors on Services."
          meta={
            <>
              {totalCount} {totalCount === 1 ? "place" : "places"} & shops
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
            subheading="Tap a group to expand and browse storefront listings."
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
              Looking for services or every category?
            </h2>
            <p className="mt-3 text-[var(--color-text-secondary)]">
              Appointment and mobile providers are on Services. Or browse every listing by category.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/services"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-7 py-3.5 text-sm font-bold text-white transition-all hover:opacity-90"
              >
                Services
              </Link>
              <Link
                href="/categories"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-7 py-3.5 text-sm font-bold text-[var(--color-text-primary)] transition-all hover:bg-[var(--color-surface-secondary)]"
              >
                All categories
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
