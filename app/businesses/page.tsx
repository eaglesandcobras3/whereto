import type { Metadata } from "next";
import Link from "next/link";
import { canonicalAlternates } from "@/lib/seo/canonical-metadata";
import { openGraphForPage } from "@/lib/seo/social-metadata";
import { BrowseHubHero } from "@/components/browse/BrowseHubHero";
import { CategoryHubLinkSections } from "@/components/browse/CategoryHubLinkSections";
import { ListBusinessHomeCta } from "@/components/home/ListBusinessHomeCta";
import { HubBreadcrumbs } from "@/components/seo/HubBreadcrumbs";
import { countCategoryHubBusinesses } from "@/lib/data/category-hub";
import { loadCategoryHubLinkSections } from "@/lib/categories/load-unified-categories";

export const revalidate = 21600;

export const metadata: Metadata = {
  ...canonicalAlternates("/businesses"),
  title: "30A Businesses: Restaurants, Shops & Services",
  description:
    "Browse local businesses along Scenic 30A — restaurants, shops, lodging, trades, and appointment-based providers — by category.",
  ...openGraphForPage({
    path: "/businesses",
    title: "30A Businesses: Restaurants, Shops & Services | WhereTo30A",
    description:
      "Local businesses along 30A: places to visit and providers to hire, browsed by category.",
  }),
};

/** Combined directory hub: links into category pages (listings live on those hubs). */
export default async function BusinessesHubPage() {
  const [sections, totalCount] = await Promise.all([
    loadCategoryHubLinkSections(),
    countCategoryHubBusinesses("all"),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <main className="flex-1">
        <BrowseHubHero
          title="Businesses"
          description="Local businesses along Scenic 30A — restaurants, shops, lodging, trades, and providers you book by appointment."
          collapsibleDescription="One directory for places you can visit and businesses that come to you. Open a group for category pages — listings are grouped by town on each category."
          meta={
            <>
              {totalCount} {totalCount === 1 ? "listing" : "listings"}
              {sections.length > 0
                ? ` in ${sections.length} browse ${sections.length === 1 ? "group" : "groups"}`
                : ""}
            </>
          }
          breadcrumbs={
            <HubBreadcrumbs
              items={[
                { name: "Home", href: "/" },
                { name: "Businesses", href: "/businesses", current: true },
              ]}
              analyticsCategory="businesses_hub_breadcrumb"
            />
          }
        />

        <section className="mx-auto max-w-6xl px-4 py-12 md:px-10">
          <CategoryHubLinkSections
            sections={sections}
            subheading="Tap a group to open category pages — listings are on each category."
            emptyMessage={
              <p className="text-[var(--color-text-secondary)]">
                No categories yet.{" "}
                <Link href="/list-your-business" className="text-[var(--color-primary)] hover:underline">
                  List your business
                </Link>
                .
              </p>
            }
          />
        </section>

        <ListBusinessHomeCta />
      </main>
    </div>
  );
}
